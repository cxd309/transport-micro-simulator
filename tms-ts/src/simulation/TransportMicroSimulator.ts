import { SimulationService } from "./SimulationService";
import { Graph } from "../graph/Graph";
import { GraphData } from "../graph/models";
import { MARecord, TransportService } from "./models";

export class TransportMicroSimulator {
  graph: Graph;
  simServices: SimulationService[];
  simTime: number;
  grantedMAs: MARecord[];

  constructor(graphData: GraphData, services: TransportService[]) {
    console.log("building simulator basis");
    this.graph = new Graph(graphData);
    this.grantedMAs = [];
    this.simServices = [];
    this.simTime = 0;

    for (const s of services) {
      const simService = new SimulationService(s);
      this.simServices.push(simService);
    }
  }

  public run(timeStep: number, duration: number): void {
    console.log("running simulation");
    this.simTime = 0;
    for (let i = 0; i < duration / timeStep; i++) {
      //console.log(`timeStep: ${(i*timeStep).toFixed(1)}s`);
      this.step(timeStep);
      this.logState();
    }
    console.log("simulation complete");
  }

  public logState(): void {
    // create a log of the current state
    // run through each of the services to find if they are at a node
  }

  private makeMARecord(): void {
    this.grantedMAs = [];

    for (const simService of this.simServices) {
      const serviceID = simService.service.serviceID;
      // find the current position

      // find the projected stopping distance
    }
  }

  public step(timeStep: number): void {
    this.simTime += timeStep;
    const newSimServices: SimulationService[] = [];

    // make a object to track all the movement authorities given

    for (const simService of this.simServices) {
      simService.updatePosition(timeStep, this.graph);

      newSimServices.push(simService);
    }
    this.simServices = newSimServices;
  }
}
