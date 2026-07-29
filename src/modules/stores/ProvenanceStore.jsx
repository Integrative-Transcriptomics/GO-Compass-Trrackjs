import {initProvenance, createAction} from "@visdesignlab/trrack";

// This file doesn't contain any syntax (yet) that would justify .jsx usage, but every other store uses .jsx and I don't want it to look out of place

// Provenance Builder: Creates initial provenance graph, seeds it with current values supplied by RootStore
export function createGoCompassProvenance(initialOntology, initialSignificanceThreshold) {
    const provenance = initProvenance({
        ontology: initialOntology,
        sigThreshold: initialSignificanceThreshold,
    });
    provenance.done(); // provenance needs to have been built before apply() can be used
    return provenance;
}

// Tracker for ontology selector context menu
// .setLabel("<YOUR LABEL HERE>") is always a fall back case if this.provenance.apply in the respective Store class (e.g. RootStore) doesn't provide a clear label
export const setOntologyAction = createAction((state, ontology) => {
    state.ontology = ontology;
}).setLabel("Set Ontology");

// Tracker for significance threshold context menu
export const setSigThresholdAction = createAction((state, sigThreshold) => {
    state.sigThreshold = sigThreshold;
}).setLabel("Set Significance Threshold");