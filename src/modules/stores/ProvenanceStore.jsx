import {initProvenance, createAction} from "@visdesignlab/trrack";

// This file doesn't contain any syntax (yet) that would justify .jsx usage, but every other store uses .jsx and I don't want it to look out of place

// Provenance Builder: Creates initial provenance graph, seeds it with current values supplied by RootStore
export function createGoCompassProvenance(initialOntology, initialSignificanceThreshold, initialFilterCutoff, initialClusterCutoff, initialResultsTab) {
    const provenance = initProvenance({
        ontology: initialOntology,
        sigThreshold: initialSignificanceThreshold,
        filterCutoff: initialFilterCutoff,
        clusterCutoff: initialClusterCutoff,
        resultsTab: initialResultsTab,
    });
    provenance.done(); // provenance needs to have been built before apply() can be used
    return provenance;
}

// PSEUDO-ROOTS
// Tracker for ontology selector context menu
// .setLabel("<YOUR LABEL HERE>") is always a fall back case if this.provenance.apply in the respective Store class (e.g. RootStore) doesn't provide a clear label
export const setOntologyAction = createAction((state, ontology) => {
    state.ontology = ontology;
}).setLabel("Set Ontology");

// Tracker for significance threshold context menu
export const setSigThresholdAction = createAction((state, sigThreshold) => {
    state.sigThreshold = sigThreshold;
}).setLabel("Set Significance Threshold");

// CHILD NODES
// Tracker for the filter cutoff slider. The slider gets "committed" once a full slider movement is completed by the user
// ALTERNATE OPTION: Trrack slider on _every_ intermediate drag position (will likely create an enormous amount of additional Trrack states)
export const setFilterCutoffAction = createAction((state, {ontology, cutoff}) => {
    state.filterCutoff[ontology] = cutoff;
}).setLabel("Set Filter Cutoff");

// Tracker for the cluster cutoff slider. The slider gets "committed" once a full slider movement is completed by the user
// ALTERNATE OPTION: Trrack slider on _every_ intermediate drag position (will likely create an enormous amount of additional Trrack states)
export const setClusterCutoffAction = createAction((state, {ontology, cutoff}) => {
    state.clusterCutoff[ontology] = cutoff;
}).setLabel("Set Cluster Cutoff");

// Tracker for the "All GO-Terms" / "Significant GO-Terms" results tab that you can see in the bottom left view quadrant
export const setResultsTabAction = createAction((state, {ontology, tab}) => {
    state.resultsTab[ontology] = tab;
}).setLabel("Set Results Tab");