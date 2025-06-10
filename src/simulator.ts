//work out how to do this on document load

let form = document.querySelector("#fileUploadForm");
let file = document.querySelector("#fileSelector");
if (form) form.addEventListener("submit", runSim);

function loadSimData(): void {}

function runSim(event: Event): void {
  event.preventDefault();

  // load in the data from the file
  // create TransportMicroSimulator class
  // serve the simlog to the user
}
