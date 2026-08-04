import {DataStore} from "./DataStore";
import {action, extendObservable} from "mobx";

// Import Trrack functionality from ProvenanceStore.jsx
//import * as ProvenanceStore from "./ProvenanceStore"
import {createGoCompassProvenance, setOntologyAction, setSigThresholdAction, setFilterCutoffAction, setClusterCutoffAction, setResultsTabAction} from "./ProvenanceStore";
// do we need setFilterCutoffAction, setClusterCutoffAction, setResultsTabAction here?
export class RootStore {
    constructor() {
        this.ontologies_map = {BP: "Biological process", MF: "Molecular function", CC: "Cellular component"};
        this.dataStores = {};
        this.selectedMeasure = "Wang";
        this.pvalueFilter = 0.05;
        this.hasGeneInfo = true;
        this.hasFCs = true
        this.geneValues = [];
        this.goSetSize = []

        // SESSION COUNTER
        // Incremeent sessionID every time init() is called, so App.js can fully "restart" when a session is imported via the importProvenance function
        // Introduced primarily as a workaround to avoid https://github.com/mobxjs/mobx-react#the-set-of-provided-stores-has-changed-error
        this.sessionID = 0;

        Object.keys(this.ontologies_map).forEach(ont => {
                this.dataStores[ont] = null
        });
        extendObservable(this, {
            initialized:false,
            ontology: "BP",
            sigThreshold: 0.05,
            ontologies: [],
            get logSigThreshold() {
                return -Math.log10(this.sigThreshold);
            },
            // init starts dormant
            init: action((results, conditions, tableColumns, hasFC, geneValues, goSetSize, selectedMeasure, pvalueFilter) => {
                this.initialized=true
                this.sessionID += 1;

                this.selectedMeasure = selectedMeasure;
                this.pvalueFilter = pvalueFilter;
                this.hasGeneInfo = Object.keys(geneValues).length > 0;
                this.hasFCs = hasFC
                this.geneValues = geneValues;
                this.goSetSize = goSetSize
                Object.keys(results).forEach(ont => {
                    if (Object.keys(results[ont].tree).length !== 0) {
                        // Needed for Trrack: pass ontology id (ont) over to DataStore:
                        this.dataStores[ont] = new DataStore(ont, results[ont].data, results[ont].tree, conditions, tableColumns, this)
                    } else {
                        this.dataStores[ont] = null
                    }
                });
                this.ontologies = Object.keys(results).map(ont => {
                    return ({id: ont, name: this.ontologies_map[ont]})
                });
                this.sigThreshold = Number(pvalueFilter) <= 0.05 ? Number(pvalueFilter) : 0.05
                
                // TRRACK COMPONENT FOR MobX extendObservable START
                // We addtionally need to keep the three values below stored as fields so we can perform a full data export/import later on
                this.conditions = conditions;
                this.results = results;
                this.tableColumns = tableColumns;

                // OLD, CAN PROBABLY BE DELETED
                // Build septuple with our initial tracking values by calling seedStatesPerOntology()
                // const { filterCutoff, clusterCutoff, conditionIndex, resultsTab, selectionLocked, selectedConditions, scaleLocked } = this.seedStatesPerOntology();
                
                /* Create Provenance and observe it globally
                * Call createGoCompassProvenance from ProvenanceStore to build provenance out of:
                *  Global, independent variables:
                *   ontology and sigThreshold:              Global values shared by the entirety of GO-Compass. They're set up via extendObservable right in _this_ specific RootStore instance
                *
                *  Local, dependent variables:
                *   filterCutoff and clusterCutoff:         Ontology-dependent values associated with the Cluster and Filter slider seen in the top left quadrant of the app
                * 
                *   conditionIndex:                         Ontology-dependent value that records which specific comparison pair (like D8vsD0, ...)
                *                                           is currently selected/getting displayed to the user in the top right treemap panel
                * 
                *   resultsTab:                             Ontology-dependent value that records whether the "All GO-Terms" or "Significant GO-Terms"
                *                                           tab is currently selected in the Overview List Comparison panel (bottom left quadrant)
                * 
                *   selectionLocked and selectedConditions: Ontology-dependent values that record whetehr a set/intersection selection is currently locked in the
                *                                           UpSet plot and which conditions it contains (Significant GO-Terms tab, bottom left quadrant)
                *
                *   scaleLocked:                            Ontology-dependent value that ... TODO
                */
                this.provenance = createGoCompassProvenance(this.ontology, this.sigThreshold, this.seedStatesPerOntology());
                // Replay into RootStore only on undo/redo/ [goToNode later if we start doing graph stuff}
                // NOTE: Don't use it on apply()
                this.provenance.addGlobalObserver(action((graph, change) => {
                    // This flag tells Trrack that the app state has changed (keeps it in sync with MobX)
                    if (change === "CurrentChanged") {
                        const state = this.provenance.state;
                        //
                        this.ontology = state.ontology;
                        this.sigThreshold = state.sigThreshold;
                        this.restoreStatesPerOntology(state);
                    }
                }));
                // provenance needs to have been built before provenance.apply(...) can be used due how its implemented in ProvenanceCreator.ts
                this.provenance.done();
                this.syncStateFromProvenance(this.provenance.state);
            }),

            // Seed/populate per-ontology maps for all values that we want to track via our provenance graph
            // Technically we do not need a separate function for initial seeding, it could be done right next to this.provenance = createGoCompassProvenance(...), but in my opinion, it does improve readability
            seedStatesPerOntology: action(() => {
                const initialFilterCutoff = {}, initialClusterCutoff = {}, initialConditionIndex = {}, initialResultsTab = {}, initialSelectionLocked = {}, initialSelectedConditions = {}, initialScaleLocked = {};
                // "for every ontology ID available, if said ontology ID has a DataStore instance, 
                // read its current values and then use them to seed Trrack's initial per-ontology state"
                Object.keys(this.dataStores).forEach(ont => {
                    if (this.dataStores[ont]) {
                        // Values relevant for the top left quadrant of the app
                        initialFilterCutoff[ont] = this.dataStores[ont].filterCutoff;
                        initialClusterCutoff[ont] = this.dataStores[ont].clusterCutoff;

                        // Values relevant for the top right quadrant of the app
                        initialConditionIndex[ont] = this.dataStores[ont].visStore.conditionIndex;

                        // Values relevant for the bottom left quadrant of the app
                        initialResultsTab[ont] = this.dataStores[ont].visStore.resultsTab;
                        initialSelectionLocked[ont] = this.dataStores[ont].visStore.selectionLocked;
                        initialSelectedConditions[ont] = this.dataStores[ont].visStore.selectedConditions;

                        // Values relevant for the bottom right quadrant of the app
                        initialScaleLocked[ont] = this.dataStores[ont].visStore.scaleLocked;
                    }
                });
                return {
                    filterCutoff: initialFilterCutoff, clusterCutoff: initialClusterCutoff,
                    conditionIndex: initialConditionIndex,
                    resultsTab: initialResultsTab, selectionLocked: initialSelectionLocked, selectedConditions: initialSelectedConditions,
                    scaleLocked: initialScaleLocked
                };
            }),

            // Restore per-ontology state directly to the DataStore/VisStore/ instances [filter/cluster cutoffs, results tab, locked selection, perhaps more to come...]
            // This revision now bypasses their actions, preventing provenance.apply() from getting re-triggered, thus avoiding some strange self-loop
            restoreStatesPerOntology: action((state) => {
                // "for every ontology ID available, if said ontology ID has a DataStore instance, 
                // read Trrack's current per-ontology state and use it to restore the DataStore's and VisStore's value"
                Object.keys(this.dataStores).forEach(ont => {
                    if (this.dataStores[ont]) {
                        // Values relevant for the top left quadrant of the app
                        this.dataStores[ont].filterCutoff = state.filterCutoff[ont];
                        this.dataStores[ont].recalculateFiltering(state.filterCutoff[ont]); // Occasionally, filter did not correctly get recalculated upon state restoration. This fixes it
                        this.dataStores[ont].clusterCutoff = state.clusterCutoff[ont];

                        // Values relevant for the top right quadrant of the app
                        this.dataStores[ont].visStore.conditionIndex = state.conditionIndex[ont];

                        // Values relevant for the bottom left quadrant of the app
                        this.dataStores[ont].visStore.resultsTab = state.resultsTab[ont];
                        this.dataStores[ont].visStore.selectionLocked = state.selectionLocked[ont];
                        this.dataStores[ont].visStore.selectedConditions = state.selectedConditions[ont];

                        // Values relevant for the bottom right quadrant of the app
                        this.dataStores[ont].visStore.scaleLocked = state.scaleLocked[ont];
                    }
                });
            }),

            // Sync the state of the current provenance. Required for Trrack's URL sharing feature.
            // TODO: Write better description
            syncStateFromProvenance: action((state) => {
                this.ontology = state.ontology;
                this.sigThreshold = state.sigThreshold;
                this.restoreStatesPerOntology(state);
            }),

            // Setter functionality (by Theresa) & tracking functionality (by Mathias) for ontology selection context menu
            setOntology: action((ontology) => {
                this.ontology = ontology;
                if (this.provenance) {
                    this.provenance.apply(setOntologyAction(ontology), `Set ontology to ${ontology}`);
                }
            }),
            // Setter functionality (by Theresa) & tracking functionality (by Mathias) for threshold selection context menu
            setSigThreshold: action((threshold) => {
                this.sigThreshold = threshold;
                if (this.provenance) {
                    this.provenance.apply(setSigThresholdAction(threshold), `Set significance threshold to ${threshold}`);
                }
            }),

            // Import session & provenance data functionality for data previously created by exportProvenance()
            // Due to MobX batching,
            importProvenance: action((json) => {
                const session = JSON.parse(json);
                // Initializes a new session from within our current session... and crashes React. [fixed in commit 7a18fec, more info in commit 1593a50]
                this.init(session.sessionData.results, session.sessionData.conditions, session.sessionData.tableColumns,
                    session.sessionData.hasFC, session.sessionData.geneValues, session.sessionData.goSetSize,
                    session.sessionData.selectedMeasure, session.sessionData.pvalueFilter);

                this.provenance.importProvenanceGraph(session.provenanceGraph);

                const state = this.provenance.state;
                this.ontology = state.ontology;
                this.sigThreshold = state.sigThreshold;
                this.restoreStatesPerOntology(state);
            }),

            // Un-initialize GO-Compass & null its provenance, thereby bringing the user back to the landing page / data upload part
            goBackToUpload: action(() => {
                this.initialized = false;
                this.provenance = null;
            })
        });
        // TRRACK COMPONENT FOR MobX extendObservable END
    }

    // Export session & provenance data to a JSON file so that it may later be imported using importProvenance()
    exportProvenance() {
        if (!this.provenance) {
            console.error("Provenance graph is not yet initialized.");
            return;
        }

        // Create constant based on the values the Python backend has sent back to us after having performed its calculations on the input data
        const session = {
            sessionData: {
                results: this.results,
                conditions: this.conditions,
                tableColumns: this.tableColumns,
                hasFC: this.hasFCs,
                geneValues: this.geneValues,
                goSetSize: this.goSetSize,
                selectedMeasure: this.selectedMeasure,
                pvalueFilter: this.pvalueFilter,
            },

            // Turn Trrack's provenance graph into a field value of our session, then stringify it together with the backend data
            provenanceGraph: this.provenance.exportProvenanceGraph(),
        }

        const json = JSON.stringify(session);
        let blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
        let url = URL.createObjectURL(blob);
        let link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "go-compass-session-export.json");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}