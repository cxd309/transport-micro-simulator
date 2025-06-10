"use strict";
//work out how to do this on document load
let form = document.querySelector("#fileUploadForm");
let file = document.querySelector("#fileSelector");
if (form)
    form.addEventListener("submit", runSim);
function loadSimData() { }
function runSim(event) {
    event.preventDefault();
    // load in the data from the file
    // create TransportMicroSimulator class
    // serve the simlog to the user
}
