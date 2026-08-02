import {initProvenance, createAction} from "@visdesignlab/trrack";

/* 
    ProvenanceStore.jsx serves as our primary registry of provenance-enabled functions and constants. 
    These can be imported by other files in order to implement the respective tracking functionality.
    This file doesn't contain any syntax (yet) that would justify .jsx usage, but every other store uses .jsx and I don't want it to look out of place.
*/

// Provenance graph building function. Gets imported by RootStore.jsx, which seeds it with values contained within the RootStore instance
export function createGoCompassProvenance(initialOntology, initialSignificanceThreshold, initialFilterCutoff, initialClusterCutoff, initialConditionIndex, initialResultsTab, initialSelectionLocked, initialSelectedConditions) {
    const provenance = initProvenance({
        ontology: initialOntology,
        sigThreshold: initialSignificanceThreshold,
        filterCutoff: initialFilterCutoff,
        clusterCutoff: initialClusterCutoff,
        conditionIndex: initialConditionIndex,
        resultsTab: initialResultsTab,
        selectionLocked: initialSelectionLocked,
        selectedConditions: initialSelectedConditions,
    });
    provenance.done(); // provenance needs to have been built before apply() can be used [may want to check Trrack's ProvenanceCreator.ts to check the actual technical reason]
    return provenance;
}

/* ACTIONS ON PROVENANCE
Syntax is always: createAction( (<state>, <payload>) => { ... } )
<state> is the first parameter and literally always Trrack's tracked state
<payload> can be a single plain value or a tuple/triplet/... of dependent values, like {ontology, cutoff} or {ontology, selectionLocked, selectedConditions}

If we perform a forward action, aka an action that adds a child to our provenance graph, we directly execute the action and Trrack logs it.
If we perform a backward action (like undo/redo), Trrack gets the result and hands it back to us via callback
*/

// Ontologies serve as pseudo-roots [these nodes can still be child nodes themselves, I really need to find a better term...]
// Tracker for ontology selector context menu
export const setOntologyAction = createAction((state, ontology) => {
    state.ontology = ontology;
}).setLabel("Set Ontology"); // .setLabel("<LABEL>") is a fall back case if this.provenance.apply in the respective Store class (e.g. RootStore) doesn't provide a clear label

// ONTOLOGY-INDEPENDENT ACTIONS (UNDERLYING VALUE IS SHARED ACROSS ALL ONTOLOGIES)
// Tracker for significance threshold context menu
// sigThreshold is an independent value as it lives directly in RootStore.jsx and can be altered via setSigThreshold: action((threshold) => { ... })
export const setSigThresholdAction = createAction((state, sigThreshold) => {
    state.sigThreshold = sigThreshold;
}).setLabel("Set Significance Threshold");

// ONTOLOGY-DEPENDENT ACTIONS (UNDERLYING VALUES ARE DIRECTLY RELIANT ON A GIVEN ONTOLOGY)
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

// Tracker for the condition index of the respective DataStore condition(s) value 
// conditionIndex records which specific comparison pair (like D8vsD0, ...) is currently selected/getting displayed to the user in the top right treemap panel
// If the user clicks that pair's visualization, the treemap plays an animation and "reacts" to the click by showing a specific comparison table
export const setConditiionIndexAction = createAction((state, {ontology, index}) => {
    state.conditionIndex[ontology] = index;
}).setLabel("Set Condition Index");

// Tracker for the "All GO-Terms" / "Significant GO-Terms" results tab that you can see in the bottom left view quadrant
export const setResultsTabAction = createAction((state, {ontology, tab}) => {
    state.resultsTab[ontology] = tab;
}).setLabel("Set Results Tab");

// Tracker for locking/unlocking a set-selection in the Significant GO-Terms tab
// Hover-driven highlighting is intentionally NOT tracked here [this action simply happens way too often]
// Only deliberate click-to-lock / clear-selection actions are tracked
export const setLockedSelectionAction = createAction((state, {ontology, selectionLocked, selectedConditions}) => {
    state.selectionLocked[ontology] = selectionLocked;
    state.selectedConditions[ontology] = selectedConditions;
}).setLabel("Set Locked Selection");