import {DataStore} from "./DataStore";
import {action, extendObservable} from "mobx";

// New Import: TRRACK FUNCTIONALITY
import {createGoCompassProvenance, setOntologyAction, setSigThresholdAction} from "./ProvenanceStore"; 
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
                        this.dataStores[ont] = new DataStore(results[ont].data, results[ont].tree, conditions, tableColumns, this)
                    } else {
                        this.dataStores[ont] = null
                    }
                });
                this.ontologies = Object.keys(results).map(ont => {
                    return ({id: ont, name: this.ontologies_map[ont]})
                });
                this.sigThreshold = Number(pvalueFilter) <= 0.05 ? Number(pvalueFilter) : 0.05

                // Create Provenance and observe it globally
                this.provenance = createGoCompassProvenance(this.ontology, this.sigThreshold); 
                // Replay into RootStore only on undo/redo/ [goToNode later if we start doing graph stuff}
                // Note: Don't use it on apply()
                this.provenance.addGlobalObserver(action((graph, change) => {
                    // This flag tells Trrack that the app state has changed (keeps it in sync with MobX)
                    if (change === "CurrentChanged") { 
                        const state = this.provenance.state;
                        this.ontology = state.ontology;
                        this.sigThreshold = state.sigThreshold;
                    }
                }));

            }),
            // Trracking functionality for ontology and threshold methods + importProvenance function
           setOntology: action((ontology) => {
                this.ontology = ontology;
                if (this.provenance) { 
                    this.provenance.apply(setOntologyAction(ontology), `Set ontology to ${ontology}`);
                }
            }),
            setSigThreshold: action((threshold) => {
                this.sigThreshold = threshold;
                if (this.provenance) {
                    this.provenance.apply(setSigThresholdAction(threshold), `Set significance threshold to ${threshold}`);
                }
            }),
            // Import provenance data previously created by exportProvenance()
            importProvenance: action((json) => {
                this.provenance.importProvenanceGraph(json);
                const state = this.provenance.state;
                this.ontology = state.ontology;
                this.sigThreshold = state.sigThreshold;
            }),
        });
    }
}