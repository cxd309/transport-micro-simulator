import { createBasicLoopGraph } from "./utils/helpers";
import { VehicleClass, TransportService } from "./simulation/models";
import { TransportMicroSimulator } from "./simulation/TransportMicroSimulator";

const loopGraph = createBasicLoopGraph(20, 2000, 50);

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
      t_dwell: 60,
    },
    {
      nodeID: "STN.005",
      t_dwell: 60,
    },
    {
      nodeID: "STN.010",
      t_dwell: 60,
    },
    {
      nodeID: "STN.017",
      t_dwell: 60,
    },
  ],
  serviceID: "SVC.001",
  startNodeID: "STN.001",
  vehicle: veh,
};

const sim = new TransportMicroSimulator(loopGraph, [r]);
sim.run(1, 2000);

//const { route, len } = graph.shortestPath('E', 'A'); // Find shortest path from node "A"
//console.log(route); // Shortest distances from node A
//console.log(len); // Previous nodes to reconstruct paths
