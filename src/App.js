import React, {useEffect} from 'react';
import Plots from "./modules/Plots";
import Toolbar from "@material-ui/core/Toolbar";
import AppBar from "@material-ui/core/AppBar";
import Typography from "@material-ui/core/Typography";
import {createStyles, FormControl, InputLabel, MenuItem, Select, Theme} from "@material-ui/core";
import {makeStyles} from "@material-ui/core/styles";
import SelectData from "./modules/SelectData";
import {observer, Provider} from "mobx-react";
import IconButton from "@material-ui/core/IconButton";
import GitHubIcon from "@material-ui/icons/GitHub";

// Additional Material UI icons
import Button from "@material-ui/core/Button";
import UndoIcon from "@material-ui/icons/Undo";
import RedoIcon from "@material-ui/icons/Redo";
import GetAppIcon from "@material-ui/icons/GetApp";
import PublishIcon from "@material-ui/icons/Publish";

const App = observer((props) => {
    const useStyles = makeStyles((theme: Theme) =>
        createStyles({
            root: {
                flexGrow: 1,
            },
            menuButton: {
                marginRight: theme.spacing(2),
                minWidth: 170 // prevent buttons from "shrinking" when the user selects options with short name
            },
            title: {
                flexGrow: 1,
            },
            input: {
                color: "white",
                borderColor: "white"
            },
            select: {
                color: "white",
                '&:before': {
                    borderColor: "white",
                },
                '&:after': {
                    borderColor: "white",
                }
            },
            icon: {
                fill: "white",
            },
        }),
    );
    const appBar = React.createRef();

    useEffect(() => {
        if (appBar.current != null && props.rootStore.initialized) {
            props.rootStore.dataStores[props.rootStore.ontology].visStore.setPlotHeight(window.innerHeight - appBar.current.getBoundingClientRect().height);
        }
    }, [appBar, props.rootStore.dataStores, props.rootStore.initialized, props.rootStore.ontology]);

    // Keyboard shortcut functionality ("hotkeys") 
    // CTRL+Z (STRG+Z) to undo a provenance-enabled action 
    // CTRL+Y (STRG+Y) to redo a provenance-enabled action
    useEffect(() => {
        const handleKeyDown = (event) => {

            // No provenance? No undo/redo hotkeys!
            if (!props.rootStore.provenance) {
                return;
            }

            // Hotkey assignment
            const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z";
            const isRedo = (event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === "y" || (event.shiftKey && event.key.toLowerCase() === "z"));

            // Execute undo/redo logic depending on what button has been triggered
            if (isUndo) {
                event.preventDefault();
                if (props.rootStore.provenance.current.id !== props.rootStore.provenance.root.id) {
                    props.rootStore.provenance.undo();
                }
            } else if (isRedo) {
                event.preventDefault();
                if (props.rootStore.provenance.current.children.length !== 0) {
                    props.rootStore.provenance.redo();
                }
            }
        };

        // Global keydown listener for the entire GO-Compass window
        window.addEventListener("keydown", handleKeyDown);
        // Remove old listener before attaching new one when the effect is re-run
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [props.rootStore]);

    const classes = useStyles();
    let views = [];
    // create one view for each ontology
    props.rootStore.ontologies.forEach(ont => {
        if (props.rootStore.dataStores[ont.id] !== null) {
            views.push(<div key={ont.id} style={{display: props.rootStore.ontology === ont.id ? "block" : "none"}}>
                <Provider dataStore={props.rootStore.dataStores[ont.id]}
                          visStore={props.rootStore.dataStores[ont.id].visStore}>
                    <Plots logSigThreshold={props.rootStore.logSigThreshold} sigThreshold={props.rootStore.sigThreshold}
                           isTimeSeries={props.rootStore.isTimeSeries}/>
                </Provider>
            </div>)
        }
    });
    return (
        // New div so Typography and Buttons can inherit styles from it
        // Trrack'd Title Bar Start
        <div className={classes.root}>
            <React.Fragment>
                <AppBar ref={appBar} position="sticky" style={{backgroundColor: "#a51e37"}}>
                    <Toolbar>
                        <div className={classes.title} style={ {display: "flex", alignItems: "center"} }>
                            <Typography variant="h6">
                                GO-Compass
                            </Typography>

                            <Button disabled={!props.rootStore.provenance} startIcon={<GetAppIcon style={{color: "white"}}/>}
                                style={{color: props.rootStore.provenance ? "white" : "rgba(255, 255, 255, 0.3"}} // white if provenance data is found, otherwise grayish black
                                onClick={() => props.rootStore.exportProvenance()}>
                                Export
                            </Button>
                            <Button startIcon={<PublishIcon style={{color: "white"}}/>}
                            // needed as "label" so the button can trigger the file picker
                                style={{color: "white"}}
                                component="label"> 
                                Import
                                <input type="file"
                                    style={{display: "none"}}
                                    onChange={(event) => {
                                        // change event fires when its value changes
                                        const inputFile = event.target.files[0];
                                        const inputFileReader = new FileReader();
                                        inputFileReader.onload = () => props.rootStore.importProvenance(inputFileReader.result);
                                        inputFileReader.readAsText(inputFile);
                                        // reset the input back to "unset" state so the next time the user picks a file, the browser registers it as a new change
                                        event.target.value = null; 
                                    }}/>
                            </Button>
                        </div>
                        {props.rootStore.initialized ?
                            // Trrack'd Title Bar End
                            // Trrack Provenance-related Actions Start
                            // Disable Undo button when provenance is not available or when we're already sitting at the root node [strict equality might not be necessary]
                            [<Button key={"undo"} disabled={!props.rootStore.provenance || props.rootStore.provenance.current.id === props.rootStore.provenance.root.id}
                                style={{ color: (!props.rootStore.provenance || props.rootStore.provenance.current.id === props.rootStore.provenance.root.id) ? "rgba(255, 255, 255, 0.3)" : "white" }}
                                onClick={() => props.rootStore.provenance.undo()}>
                                <span style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <UndoIcon style={{ color: (!props.rootStore.provenance || props.rootStore.provenance.current.id === props.rootStore.provenance.root.id) ? "rgba(255, 255, 255, 0.3)" : "white" }}/>
                                    <span style={{ fontSize: "0.65rem" }}>CTRL+Z</span>
                                </span>
                            </Button>,
                                // Disable Redo button when provenance is not available or when the graph has no children [strict equality is actually necessary]
                                <Button key={"redo"} disabled={!props.rootStore.provenance || props.rootStore.provenance.current.children.length === 0}
                                    style={{ color: (!props.rootStore.provenance || props.rootStore.provenance.current.children.length === 0) ? "rgba(255, 255, 255, 0.3)" : "white" }}
                                    onClick={() => props.rootStore.provenance.redo()}>
                                    <span style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <RedoIcon style={{ color: (!props.rootStore.provenance || props.rootStore.provenance.current.children.length === 0) ? "rgba(255, 255, 255, 0.3)" : "white" }}/>
                                        <span style={{ fontSize: "0.65rem" }}>CTRL+Y</span>
                                    </span>
                                </Button>,
                            <FormControl className={classes.menuButton} key={"ont"}>
                                <InputLabel style={{color: "white"}}
                                >Ontology</InputLabel>
                                <Select
                                    className={classes.select}
                                    inputProps={{
                                        classes: {
                                            icon: classes.icon
                                        }
                                    }}
                                    value={props.rootStore.ontology}
                                    onChange={(e) => props.rootStore.setOntology(e.target.value)}
                                >
                                    {props.rootStore.ontologies.filter(ontology => props.rootStore.dataStores[ontology.id] !== null).map(ontology =>
                                        <MenuItem key={ontology.id}
                                                  value={ontology.id}>{ontology.name}</MenuItem>)}
                                </Select>
                            </FormControl>,
                                <FormControl className={classes.menuButton} key={"sig"}>
                                <InputLabel style={{color: "white"}}
                                >Significance Threshold</InputLabel>
                                <Select
                                    className={classes.select}
                                    inputProps={{
                                        classes: {
                                            icon: classes.icon
                                        }
                                    }}
                                    value={props.rootStore.sigThreshold}
                                    onChange={(e) => props.rootStore.setSigThreshold(e.target.value)}
                                >
                                    {[0.05,0.01,0.005,0.001,0.0005,0.0001,0.00005,0.00001].map(pval =>
                                        <MenuItem key={pval}
                                                  value={pval}>{pval}</MenuItem>)}
                                </Select>
                            </FormControl>,
                                <Typography key={"info"}>
                                    {"Method: "
                                        + props.rootStore.selectedMeasure + ", p-Value Filter: " + props.rootStore.pvalueFilter + ", Help"}
                                </Typography>] : <Typography>{"Help"}</Typography>}
                        <IconButton href="https://github.com/Integrative-Transcriptomics/GO-Compass"
                                    target="_blank"
                                    rel="noopener noreferrer"> <GitHubIcon style={{color: "white"}}/>
                        </IconButton>
                    </Toolbar>
                </AppBar>
            </React.Fragment>
            {/* Whenever the sessionID in RootStore changes, React treats the fragement down below and everything inside of it as a brand new element.
                This allows us to avoid the https://github.com/mobxjs/mobx-react#the-set-of-provided-stores-has-changed-error [link isn't helpful at all] issue,
                although I'm still not entirely sure about the underlying React logic here. Here are the two sources that provided me with the idea for my solution/workaround:
                https://cmichel.io/react-fun-with-keys/, https://www.nikgraf.com/blog/using-reacts-key-attribute-to-remount-a-component
            */}
            <React.Fragment key={props.rootStore.sessionID}>
                {props.rootStore.initialized && views.length > 0 ? views :
                    <SelectData setRootStore={props.rootStore.init}/>}
                {props.rootStore.initialized && views.length === 0 ?
                    <Typography>No significant results</Typography> : null}
            </React.Fragment>
        </div>
    );
});

export default App;
