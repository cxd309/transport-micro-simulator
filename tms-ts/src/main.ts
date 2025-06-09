import { createBasicLoopGraph, saveGraphToDrawIO } from "./utils/helpers";
import { VehicleClass, TransportService } from "./simulation/models";
import { TransportMicroSimulator } from "./simulation/TransportMicroSimulator";
import { Graph } from "./graph/Graph";
import { GraphData } from "./graph/models";

const loopGraph = createBasicLoopGraph(4, 100, 20);

const testGraph: GraphData = {
  nodes: [
    {
      nodeID: "A",
      type: "station",
      loc: { x: 1, y: 1 },
    },
    {
      nodeID: "B",
      type: "station",
      loc: { x: 1, y: -1 },
    },
    {
      nodeID: "C",
      type: "station",
      loc: { x: 2, y: 0 },
    },
    {
      nodeID: "D",
      type: "station",
      loc: { x: -1, y: 0 },
    },
  ],
  edges: [
    {
      edgeID: "A->C",
      u: "A",
      v: "C",
      len: 50,
    },
    {
      edgeID: "B->C",
      u: "B",
      v: "C",
      len: 50,
    },
    {
      edgeID: "C->D",
      u: "C",
      v: "D",
      len: 50,
    },
    {
      edgeID: "D->A",
      u: "D",
      v: "A",
      len: 50,
    },
    {
      edgeID: "D->B",
      u: "D",
      v: "B",
      len: 50,
    },
  ],
};

const g = new Graph(testGraph);

saveGraphToDrawIO(g, "sim-outputs/drawio-graph.txt");

const veh: VehicleClass = {
  a_acc: 1,
  a_dcc: 1,
  v_max: 10,
  name: "bus",
};

const r1: TransportService = {
  stops: [
    {
      nodeID: "A",
      t_dwell: 10,
    },
    {
      nodeID: "D",
      t_dwell: 10,
    },
  ],
  serviceID: "SVC.001",
  startNodeID: "A",
  vehicle: veh,
};

const r2: TransportService = {
  stops: [
    {
      nodeID: "B",
      t_dwell: 10,
    },
    {
      nodeID: "D",
      t_dwell: 10,
    },
  ],
  serviceID: "SVC.002",
  startNodeID: "B",
  vehicle: veh,
};

const sim = new TransportMicroSimulator(testGraph, [r1, r2]);
sim.run(1, 35);

//const { route, len } = graph.shortestPath('E', 'A'); // Find shortest path from node "A"
//console.log(route); // Shortest distances from node A
//console.log(len); // Previous nodes to reconstruct paths
