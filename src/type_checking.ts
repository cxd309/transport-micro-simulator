import {
  Coordinate,
  GraphData,
  GraphEdge,
  GraphNode,
  SimulatorParameters,
  RouteStop,
  VehicleClass,
  TransportService,
} from "./TransportMicroSimulator.js";

function isCoordinate(obj: any): obj is Coordinate {
  return (
    typeof obj === "object" &&
    typeof obj.x === "number" &&
    typeof obj.y === "number"
  );
}

function isGraphEdge(obj: any): obj is GraphEdge {
  return (
    typeof obj === "object" &&
    typeof obj.edgeID === "string" &&
    typeof obj.u === "string" &&
    typeof obj.v === "string" &&
    typeof obj.len === "number" &&
    (obj.parentEdge === undefined || typeof obj.parentEdge === "string")
  );
}

function isGraphNode(obj: any): obj is GraphNode {
  return (
    typeof obj === "object" &&
    isCoordinate(obj.loc) &&
    typeof obj.nodeID === "string" &&
    (obj.type === "main" || obj.type === "station" || obj.type === "side")
  );
}

function isGraphData(obj: any): obj is GraphData {
  return (
    typeof obj === "object" &&
    Array.isArray(obj.nodes) &&
    obj.nodes.every(isGraphNode) &&
    Array.isArray(obj.edges) &&
    obj.edges.every(isGraphEdge)
  );
}

function isRouteStop(obj: any): obj is RouteStop {
  return (
    typeof obj === "object" &&
    typeof obj.nodeID === "string" &&
    typeof obj.t_dwell === "number"
  );
}

// VehicleClass validator
function isVehicleClass(obj: any): obj is VehicleClass {
  return (
    typeof obj === "object" &&
    typeof obj.name === "string" &&
    typeof obj.a_acc === "number" &&
    typeof obj.a_dcc === "number" &&
    typeof obj.v_max === "number"
  );
}

function isTransportService(obj: any): obj is TransportService {
  return (
    typeof obj === "object" &&
    typeof obj.serviceID === "string" &&
    typeof obj.startNodeID === "string" &&
    Array.isArray(obj.stops) &&
    obj.stops.every(isRouteStop) &&
    isVehicleClass(obj.vehicle)
  );
}

export function isSimulatorParameters(obj: any): obj is SimulatorParameters {
  return (
    typeof obj === "object" &&
    typeof obj.simID === "string" &&
    typeof obj.runTime === "number" &&
    typeof obj.timeStep === "number" &&
    isGraphData(obj.graphData) &&
    Array.isArray(obj.services) &&
    obj.services.every(isTransportService)
  );
}
