import { TransportMicroSimulator, } from "./TransportMicroSimulator.js";
import { isSimulatorParameters } from "./type_checking.js";
const FORM_ID = "fileUploadForm";
const FILE_ID = "fileSelector";
window.addEventListener("load", (event) => {
    const form = document.getElementById(FORM_ID);
    if (form)
        form.addEventListener("submit", loadJSON);
    console.log(form);
});
async function loadJSON(event) {
    // stop the page reload
    event.preventDefault();
    console.log("here");
    // load in the data from the file
    const fileElement = document.getElementById(FILE_ID);
    const fileList = fileElement.files;
    // check there is some data there
    if (!fileList || fileList.length < 1)
        return;
    const jsonFile = fileList[0];
    const fileContent = await readFileAsText(jsonFile);
    const parsedJSON = JSON.parse(fileContent);
    if (isSimulatorParameters(parsedJSON))
        runSim(parsedJSON);
}
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}
function runSim(simParams) {
    // create TransportMicroSimulator class
    const sim = new TransportMicroSimulator(simParams);
    // run sim
    const simLog = sim.run();
    // serve the simlog to the user
    serveSimLog(simLog);
}
function serveSimLog(simLog) {
    const filename = "mts_simulation_results.json";
    const jsonString = JSON.stringify(simLog, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}
