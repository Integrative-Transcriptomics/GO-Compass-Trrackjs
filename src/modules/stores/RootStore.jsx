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
                // Create Provenance and observe it globally
                const { filterCutoff, clusterCutoff, conditionIndex, resultsTab, selectionLocked, selectedConditions } = this.seedStatesPerOntology();
                this.provenance = createGoCompassProvenance(this.ontology, this.sigThreshold, filterCutoff, clusterCutoff, conditionIndex, resultsTab, selectionLocked, selectedConditions);
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
            }),

            // Seed per-ontology maps for filter/cluster cutoffs and results tab (more to come)
            // Technically we do not need a separate function for initial seeding, it could be done right next to this.provenance = createGoCompassProvenance(...), but it does improve readability, in my opinion
            seedStatesPerOntology: action(() => {
                const initialFilterCutoff = {}, initialClusterCutoff = {}, initialConditionIndex = {}, initialResultsTab = {}, initialSelectionLocked = {}, initialSelectedConditions = {};
                // "for every ontology ID available, if said ontology ID has a DataStore instance, 
                // read its current values and then use them to seed Trrack's initial per-ontology state"
                Object.keys(this.dataStores).forEach(ont => {
                    if (this.dataStores[ont]) {
                        initialFilterCutoff[ont] = this.dataStores[ont].filterCutoff;
                        initialClusterCutoff[ont] = this.dataStores[ont].clusterCutoff;

                        initialConditionIndex[ont] = this.dataStores[ont].visStore.conditionIndex;

                        initialResultsTab[ont] = this.dataStores[ont].visStore.resultsTab;
                        initialSelectionLocked[ont] = this.dataStores[ont].visStore.selectionLocked;
                        initialSelectedConditions[ont] = this.dataStores[ont].visStore.selectedConditions;
                    }
                });
                return { filterCutoff: initialFilterCutoff, clusterCutoff: initialClusterCutoff, 
                    conditionIndex: initialConditionIndex, 
                    resultsTab: initialResultsTab, selectionLocked: initialSelectionLocked, selectedConditions: initialSelectedConditions };
            }),

            // Restore per-ontology state directly to the DataStore/VisStore/ instances [filter/cluster cutoffs, results tab, locked selection, more to come...]
            // This revision now bypasses their actions, preventing provenance.apply() from getting re-triggered, thus avoiding some strange self-loop
            restoreStatesPerOntology: action((state) => {
                // "for every ontology ID available, if said ontology ID has a DataStore instance, 
                // read Trrack's current per-ontology state and use it to restore the DataStore's and VisStore's value"
                Object.keys(this.dataStores).forEach(ont => {
                    if (this.dataStores[ont]) {
                        this.dataStores[ont].filterCutoff = state.filterCutoff[ont];
                        this.dataStores[ont].clusterCutoff = state.clusterCutoff[ont];

                        this.dataStores[ont].visStore.conditionIndex = state.conditionIndex[ont];

                        this.dataStores[ont].visStore.resultsTab = state.resultsTab[ont];
                        this.dataStores[ont].visStore.selectionLocked = state.selectionLocked[ont];
                        this.dataStores[ont].visStore.selectedConditions = state.selectedConditions[ont];
                    }
                });
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
                this.init(session.sessionData.results, session.sessionData.conditions, session.sessionData.tableColumns,
                    session.sessionData.hasFC, session.sessionData.geneValues, session.sessionData.goSetSize,
                    session.sessionData.selectedMeasure, session.sessionData.pvalueFilter);

                this.provenance.importProvenanceGraph(session.provenanceGraph);

                const state = this.provenance.state;
                this.ontology = state.ontology;
                this.sigThreshold = state.sigThreshold;
                this.restoreStatesPerOntology(state);
            }),
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