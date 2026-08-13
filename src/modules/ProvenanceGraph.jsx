import React, { createRef, useEffect, useState, useRef } from "react";
// import { action, extendObservable } from "mobx";
import { observer } from "mobx-react";

// required for bookmarking and annotating notes in the provenance graph, otherwise it'll show little ugly boxes
import "semantic-ui-css/semantic.min.css";

// main trrack-vis visualization component
import { ProvVisCreator } from "@visdesignlab/trrack-vis";

// Provenance graph that re-renders via useEffect when MobX-observed provenance data changes elsewhere in GO-Compass
const ProvenanceGraph = observer((props) => {

    // initialize empty references for ProvVisCreator
    const containerReference = useRef(null);

    useEffect(() => {
        // check if provenance information is actually present AND if the drawer on the right is open AND if there's an actual DOM element we can draw into (onto?)
        if (props.rootStore.provenance && props.open && containerReference.current) {

            // empty out provenance graph before execution
            containerReference.current.innerHTML = "";
            const {width, height} = containerReference.current.getBoundingClientRect();

            ProvVisCreator(
                // DOM element to draw graph into
                containerReference.current,

                // The Provenance data that we want to render, taken directly from RootStore
                props.rootStore.provenance,

                 // Clicking a node in the graph calls goToNode(id), which triggers RootStore's sync, same as Undo/Redo
                (id) => props.rootStore.provenance.goToNode(id),

                // buttons: Allows us to select whether the provenance graph is displayed with its own undo/redo buttons. Setting it to false does nothing?
                true,

                // ephemeralUndo: All tracked actions GO-Compass performs are inherently meaningful, there is no need for ephemeral nodes invisible to the user
                false,

                // fauxRoot: GO-Compass currently does not use faux roots ("pseudo roots"), we always render the graph starting at the real root
                undefined,

                // Additional config settings
                {
                    width, height,
                    popupContent: (node) => node.label // hovering your mouse over a graph node displays its label
                }
            );
        }
    }, [props.open, props.rootStore.provenance] );

    // TODO: Overwrite horizontal scroll bar at the bottom of the drawer so last node is selectable even if graph is long [not sure if actually a good idea?]
    return <div ref={containerReference} style={ { width: "100%", height: "100%" } } />;
});

export default ProvenanceGraph
