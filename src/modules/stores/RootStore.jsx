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
                // Seed per-ontology maps ({ontologyId: value}) for filter/cluster cutoffs and results tab (maybe more to come)
                const initialFilterCutoff = {}, initialClusterCutoff = {}, initialResultsTab = {}, initialSelectionLocked = {}, initialSelectedConditions = {};
                Object.keys(this.dataStores).forEach(ont => {
                    if (this.dataStores[ont]) {
                        initialFilterCutoff[ont] = this.dataStores[ont].filterCutoff;
                        initialClusterCutoff[ont] = this.dataStores[ont].clusterCutoff;
                        initialResultsTab[ont] = this.dataStores[ont].visStore.resultsTab;

                        initialSelectionLocked[ont] = this.dataStores[ont].visStore.selectionLocked;
                        initialSelectedConditions[ont] = this.dataStores[ont].visStore.selectedConditions;
                    }
                });
                // Create Provenance and observe it globally
                this.provenance = createGoCompassProvenance(this.ontology, this.sigThreshold, initialFilterCutoff, initialClusterCutoff, initialResultsTab, initialSelectionLocked, initialSelectedConditions);
                // Replay into RootStore only on undo/redo/ [goToNode later if we start doing graph stuff}
                // NOTE: Don't use it on apply()
                this.provenance.addGlobalObserver(action((graph, change) => {
                    // This flag tells Trrack that the app state has changed (keeps it in sync with MobX)
                    if (change === "CurrentChanged") { 
                        const state = this.provenance.state;
                        // 
                        this.ontology = state.ontology;
                        this.sigThreshold = state.sigThreshold;
                        // Restore per-ontology state directly (bypassing DataStore bzw. VisStore actions) so this doesn't re-trigger provenance.apply and loops back on itself
                        Object.keys(state.filterCutoff).forEach(ont => {
                            if (this.dataStores[ont]) {
                                this.dataStores[ont].filterCutoff = state.filterCutoff[ont];
                                this.dataStores[ont].clusterCutoff = state.clusterCutoff[ont];
                                this.dataStores[ont].visStore.resultsTab = state.resultsTab[ont];

                                this.dataStores[ont].visStore.selectionLocked = state.selectionLocked[ont];
                                this.dataStores[ont].visStore.selectedConditions = state.selectedConditions[ont];
                            }
                        });
                    }
                }));
            }),
            // Tracking functionality for ontology selection context menu
           setOntology: action((ontology) => {
                this.ontology = ontology;
                if (this.provenance) { 
                    this.provenance.apply(setOntologyAction(ontology), `Set ontology to ${ontology}`);
                }
            }),
            // Tracking functionality for threshold selection context menu
            setSigThreshold: action((threshold) => {
                this.sigThreshold = threshold;
                if (this.provenance) {
                    this.provenance.apply(setSigThresholdAction(threshold), `Set significance threshold to ${threshold}`);
                }
            }),
            // Import provenance data functionality for data previously created by exportProvenance()
            importProvenance: action((json) => {
                this.provenance.importProvenanceGraph(json);
                const state = this.provenance.state;
                this.ontology = state.ontology;
                this.sigThreshold = state.sigThreshold;
                // Restore per-ontology state directly (bypassing DataStore bzw. VisStore actions) so this doesn't re-trigger provenance.apply and loops back on itself
                Object.keys(state.filterCutoff).forEach(ont => {
                    if (this.dataStores[ont]) {
                        this.dataStores[ont].filterCutoff = state.filterCutoff[ont];
                        this.dataStores[ont].clusterCutoff = state.clusterCutoff[ont];
                        this.dataStores[ont].visStore.resultsTab = state.resultsTab[ont];

                        this.dataStores[ont].visStore.selectionLocked = state.selectionLocked[ont];
                        this.dataStores[ont].visStore.selectedConditions = state.selectedConditions[ont];
                    }
                });
            }),
        });
        // TRRACK COMPONENT FOR MobX extendObservable END
    }

    // Export provenance data to a JSON file so that it may later be imported using importProvenance()
    exportProvenance() {
        if (!this.provenance) {
            console.error("Provenance graph is not yet initialized.");
            return;
        }
        const json = this.provenance.exportProvenanceGraph();
        let blob = new Blob([json], {type: 'application/json;charset=utf-8;'})
        let url = URL.createObjectURL(blob);
        let link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "go-compass-provenance.json");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}