import {initProvenance, createAction} from "@visdesignlab/trrack";

/* 
* ProvenanceStore.jsx serves as our primary registry of provenance-enabled functions and constants.
* These can be imported by other files in order to implement their respective tracking functionality.
* This file doesn't contain any syntax (yet) that would justify .jsx usage, but every other store uses .jsx and I don't want it to look out of place.
*/

/* 
* Provenance graph building function. Gets imported by RootStore.jsx, which seeds it with values contained within the RootStore instance
* Spread syntax/object spread ("...") copies every key-value pair from the initialOntologyDependentStates object directly into the plain initial-state object (filterCutoff, clusterCutoff ... etc.)
* This object then gets passed to Trrack's initProvenance(...), which then builds the actual provenance object
*/
export function createGoCompassProvenance(initialOntology, initialSignificanceThreshold, initialOntologyDependentStates) {
    const provenance = initProvenance({
        ontology: initialOntology,
        sigThreshold: initialSignificanceThreshold,
        ...initialOntologyDependentStates,
    }, { loadFromUrl: true });
    // provenance.done(); (not possible when loading from URL)
    return provenance;
}

/* BRIEF OVERVIEW OF TRRACK LOGIC & ACTIONS ON PROVENANCE
*
* Trrack Syntax is:
* createAction( (<state>, <payload>) => { ... } )
*   createAction(...) is the syntax that buiilds and returns the action creator.
*       setOntologyAction would be an example of an action creator
*   <state> is the first parameter and _always_ equals Trrack's currently tracked state.
*   <payload> can be a single plain value or a tuple/triplet/... of dependent values, like {ontology, cutoff} or {ontology, selectionLocked, selectedConditions}
*   => { ... } describes the reducer function which contains the actual function logic.
*   
*   When ProvenanceStore.jsx is first executed, createAction(...) runs once for each of our tracked actions,
*       thereby building an action creator (like setOntologyAction) for each of our tracked actions.
*   These action creators then get called later, wherever the corresponding change actually happens
*       e.g. RootStore.setOntology(...) calls setOntologyAction(ontology) whenever the user changes the ontology in the top right corner
*   Calling an action creator does not automatically run the corresponding reducer function contained within the action creator.
*   Only when we later perform an action that involves provenance.apply(<event>, <label>), Trrack looks up the respective reducer function,
*       checks the current provenance state and calls said reducer on (<currentState>, <payload>).
*   This is the core logic that builds up our provenance graph.
*   
*   If we perform a forward action, meaning: an action that adds a child to our provenance graph,
*       we directly execute the action and Trrack logs it for us via the provenance graph.
*   If we perform a backward action (like undo/redo), Trrack fetches the result and hands it back to us via callback logic
*/

// Ontologies serve as pseudo-roots [these nodes can still be child nodes themselves, I really need to find a better term...]
// Provenance action for ontology selector context menu
export const setOntologyAction = createAction((state, ontology) => {
    state.ontology = ontology; // BP, MF, CC
}).setLabel("Set Ontology");

// ONTOLOGY-INDEPENDENT ACTIONS (UNDERLYING VALUE IS SHARED ACROSS ALL ONTOLOGIES)
// Provenance action for significance threshold context menu
// sigThreshold is an independent value as it lives directly in RootStore.jsx and can be altered via setSigThreshold: action((threshold) => { ... })
export const setSigThresholdAction = createAction((state, sigThreshold) => {
    state.sigThreshold = sigThreshold;
}).setLabel("Set Significance Threshold");


// ONTOLOGY-DEPENDENT ACTIONS (UNDERLYING VALUES ARE DIRECTLY RELIANT ON A GIVEN ONTOLOGY)

// Provenance action for the filter cutoff slider. The slider gets "committed" once a full slider movement is completed by the user
// POSSIBLE ALTERNATE OPTION: Trrack slider on _every_ intermediate drag position (will likely create an enormous amount of additional Trrack states)
export const setFilterCutoffAction = createAction((state, {ontology, cutoff}) => {
    state.filterCutoff[ontology] = cutoff;
}).setLabel("Set Filter Cutoff");

// Provenance action for the cluster cutoff slider. The slider gets "committed" once a full slider movement is completed by the user
// POSSIBLE ALTERNATE OPTION: Trrack slider on _every_ intermediate drag position (will likely create an enormous amount of additional Trrack states)
export const setClusterCutoffAction = createAction((state, {ontology, cutoff}) => {
    state.clusterCutoff[ontology] = cutoff;
}).setLabel("Set Cluster Cutoff");

// Provenance action for the condition index of the respective DataStore condition(s) value 
// conditionIndex records which specific comparison pair (like D8vsD0, ...) is currently selected/getting displayed to the user in the top right treemap panel
// If the user clicks that pair's visualization, the treemap plays an animation and "reacts" to the click by showing a specific comparison table
export const setConditiionIndexAction = createAction((state, {ontology, index}) => {
    state.conditionIndex[ontology] = index;
}).setLabel("Set Condition Index");

// Provenance action for the "All GO-Terms" / "Significant GO-Terms" results tab that you can see in the bottom left view quadrant
export const setResultsTabAction = createAction((state, {ontology, tab}) => {
    state.resultsTab[ontology] = tab;
}).setLabel("Set Results Tab");

// Provenance action for locking/unlocking a set-selection in the Significant GO-Terms tab
// Hover-driven highlighting is intentionally NOT tracked here. This would simply give us too many intermediate values to take care off and noticeably slow down GO-Compass
// Only deliberate click-to-lock / clear-selection actions are tracked
export const setLockedSelectionAction = createAction((state, {ontology, selectionLocked, selectedConditions}) => {
    state.selectionLocked[ontology] = selectionLocked;
    state.selectedConditions[ontology] = selectedConditions;
}).setLabel("Set Locked Selection");

// Provenance action for UNLOCK Y-SCALE / LOCK Y-SCALE button in the bottom right quadrant of GO-Compass
// Todo: More technical explanation
export const setScaleLockedAction = createAction((state, {ontology, locked}) => {
    state.scaleLocked[ontology] = locked;
}).setLabel("Set Y-Scale Lock");
