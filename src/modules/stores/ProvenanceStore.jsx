import {initProvenance, createAction} from "@visdesignlab/trrack";

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
export const setOntologyAction = createAction((state, ontology) => {
    state.ontology = ontology;
}).setLabel("Set Ontology");

// Tracker for significance threshold context menu
export const setSigThresholdAction = createAction((state, sigThreshold) => {
    state.sigThreshold = sigThreshold;
}).setLabel("Set Significance Threshold");