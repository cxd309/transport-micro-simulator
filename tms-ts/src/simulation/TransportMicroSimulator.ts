import { SimulationService } from "./SimulationService";
import { Graph } from "../graph/Graph";
import { GraphData, GraphPosition } from "../graph/models";
import { MAMap, MARecord, TransportService } from "./models";
import { truncateMA } from "../utils/helpers";

export class TransportMicroSimulator {
  graph: Graph;
  simServices: SimulationService[];
  simTime: number;
  maRecord: MAMap;

  constructor(graphData: GraphData, services: TransportService[]) {
    console.log("building simulator basis");
    this.graph = new Graph(graphData);
    this.simServices = [];
    this.simTime = 0;
    this.maRecord = new Map();

    for (const s of services) {
      const simService = new SimulationService(s, this.graph);
      this.simServices.push(simService);
      this.maRecord.set(simService.service.serviceID, {
        serviceID: simService.service.serviceID,
        segments: [],
      });
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
    for (const simService of this.simServices) {
      console.log(
        "time",
        this.simTime.toFixed(1),
        "service",
        simService.service.serviceID,
        "at edge",
        simService.currentPosition.edge.edgeID,
        "distance",
        simService.currentPosition.distanceAlongEdge.toFixed(0),
        "velocity",
        simService.velocity.toFixed(0),
        "state",
        simService.state
      );
    }
  }

  public step(timeStep: number): void {
    this.simTime += timeStep;
    const newSimServices: SimulationService[] = [];

    for (const simService of this.simServices) {
      const id = simService.service.serviceID;

      const proposedMASegments = simService.calculateProposedMA(
        this.graph,
        timeStep
      );

      const grantedMASegments = truncateMA(
        proposedMASegments,
        this.maRecord,
        id
      );

      this.maRecord.set(id, {
        serviceID: id,
        segments: grantedMASegments,
      });

      simService.updatePosition(timeStep, this.graph, grantedMASegments);

      newSimServices.push(simService);
    }
    this.simServices = newSimServices;
  }
}
