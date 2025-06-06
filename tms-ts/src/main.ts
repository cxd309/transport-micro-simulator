import { createBasicLoopGraph, saveGraphToDrawIO } from "./utils/helpers";
import { VehicleClass, TransportService } from "./simulation/models";
import { TransportMicroSimulator } from "./simulation/TransportMicroSimulator";
import { Graph } from "./graph/Graph";

const loopGraph = createBasicLoopGraph(4, 50, 100);
const g = new Graph(loopGraph);

saveGraphToDrawIO(g, "sim-outputs/drawio-graph.txt");

const veh: VehicleClass = {
  a_acc: 1,
  a_dcc: 1,
  v_max: 80,
  name: "bus",
};

const r: TransportService = {
  stops: [
    {
      nodeID: "STN.001",
      t_dwell: 5,
    },
    {
      nodeID: "STN.003",
      t_dwell: 5,
    },
  ],
  serviceID: "SVC.001",
  startNodeID: "STN.004",
  vehicle: veh,
};

const sim = new TransportMicroSimulator(loopGraph, [r]);
sim.run(0.1, 20);

//const { route, len } = graph.shortestPath('E', 'A'); // Find shortest path from node "A"
//console.log(route); // Shortest distances from node A
//console.log(len); // Previous nodes to reconstruct paths
