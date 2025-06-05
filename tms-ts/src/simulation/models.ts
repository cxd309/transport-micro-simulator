export type SimulationState =
  | "stationary"
  | "accelerating"
  | "decelerating"
  | "cruising";

export interface RouteStop {
  nodeID: string; // nodeID for the stop
  t_dwell: number; // dwell time at stop (s)
}

export interface TransportService {
  serviceID: string;
  startNodeID: string; // startNodeID
  stops: RouteStop[]; // stops to make (this will be cyclical A->B->C->A...)
  vehicle: VehicleClass;
}

export interface VehicleClass {
  name: string;
  a_acc: number; // acceleration rate (m/s/s)
  a_dcc: number; // deceleration rate (m/s/s)
  v_max: number; // maximum speed (m/s)
}
