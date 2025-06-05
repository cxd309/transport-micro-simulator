import { TransportService, SimulationState } from "./models";
import { GraphEdge } from "../graph/models";
import { Graph } from "../graph/Graph";

export class SimulationService {
  service: TransportService;
  position: string; //nodeID for current position
  nextStop: string; //nodeID for the next stop
  velocity: number;
  state: SimulationState;
  s_acc: number;
  s_dcc: number;
  remainingDwell: number;
  currentEdge?: GraphEdge;
  distanceAlongEdge: number;

  constructor(service: TransportService) {
    this.service = service;
    this.position = service.startNodeID;
    if (service.startNodeID === service.stops[0].nodeID) {
      this.nextStop = service.stops[1].nodeID;
    } else {
      this.nextStop = service.stops[0].nodeID;
    }

    this.velocity = 0;
    this.state = "stationary";

    this.s_acc =
      this.service.vehicle.v_max ** 2 / (2 * this.service.vehicle.a_acc);
    this.s_dcc =
      this.service.vehicle.v_max ** 2 / (2 * this.service.vehicle.a_dcc);

    this.remainingDwell = 0;
    this.distanceAlongEdge = 0;
    this.currentEdge = undefined;
  }

  public setEdgeFromPosition(g: Graph): void {
    // use the current position and the route to the next stop to find
    // the next edge on that path

    const { route } = g.shortestPath(this.position, this.nextStop);

    if (route.length < 2) {
      console.warn("current position is equal to next step, no edge to find");
    } else {
      const nextEdge = g.getEdge(route[0], route[1]);
      if (!nextEdge) {
        console.warn(
          `Cannot find next edge, there is no edge from ${g.getEdgeKey(
            route[0],
            route[1]
          )}`
        );
      } else {
        this.currentEdge = nextEdge;
        this.distanceAlongEdge = 0;
      }
    }
  }

  public startDwell(remainingTime: number, g: Graph): void {
    // set the vehicle to stationary
    this.velocity = 0;
    this.state = "stationary";

    // find the index of the current position
    const curStopIndex =
      this.service.stops.findIndex(
        (stop) => stop.nodeID === this.currentEdge?.v
      ) ?? 0;
    const nextStopIndex = (curStopIndex + 1) % this.service.stops.length;

    // set the dwell time
    this.remainingDwell =
      this.service.stops[curStopIndex].t_dwell - remainingTime;
    // set the next stop
    this.nextStop = this.service.stops[nextStopIndex].nodeID;
    // move to the next edge
    this.moveToNextEdge(g);
  }

  public advanceDwell(timeStep: number): void {
    this.remainingDwell -= timeStep;
    if (this.remainingDwell <= 0) {
      this.remainingDwell = 0;
      this.velocity = 0;
      this.state = "accelerating";
    }
  }

  public updatePosition(timeStep: number, graph: Graph): void {
    if (this.remainingDwell > 0) {
      // check if remainingdwell - timeStep < 0
      this.advanceDwell(timeStep);
    } else {
      this.moveVehicle(timeStep, graph);
    }
  }

  public findTimeToTravelDistance(s: number, a: number): number {
    const v_u = Math.max(0.001, this.velocity); // prevent divide by zero error
    let t = 0;

    const dis = this.velocity ** 2 + 2 * a * s;

    if (dis < 0) {
      console.warn(
        `Error in finding time to travel a distance:`,
        `discriminator is less than 0, the distance cannot be reached`,
        `v_u: ${v_u}`,
        `s: ${s}`,
        `a: ${a}`,
        `dis: ${dis}`
      );
      return t;
    }

    t = (-this.velocity + Math.sqrt(dis)) / a;
    if (!(!isFinite(t) && t > 0)) {
      t = s / v_u;
    }
    return t;
  }

  public findDistanceTravelledInTime(t: number): {
    s_travelled: number;
    a: number;
    v_final: number;
  } {
    let a: number;
    switch (this.state) {
      case "accelerating":
        a = this.service.vehicle.a_acc;
        break;
      case "decelerating":
        a = this.service.vehicle.a_dcc;
        break;
      default:
        a = 0;
        break;
    }
    const v_initial = this.velocity;
    // make sure final velocity is not less that 0 or greater than v_max
    const v_final = Math.min(
      Math.max(v_initial + a * t, 0),
      this.service.vehicle.v_max
    );

    const s_travelled = t * ((v_initial + v_final) / 2);

    return { s_travelled, a, v_final };
  }

  public getMovementAuthority(g: Graph): number {
    return (
      g.shortestPath(this.position, this.nextStop)["len"] -
      this.distanceAlongEdge
    );
  }

  public setState(movementAuthority: number): void {
    const breakingDistance =
      this.velocity ** 2 / (2 * this.service.vehicle.a_dcc);
    // if the distance to next stop is within the breaking distance
    if (movementAuthority <= breakingDistance) {
      this.state = "decelerating";
    }
    // if the velocity is less than v_max
    else if (this.velocity < this.service.vehicle.v_max) {
      this.state = "accelerating";
    }
    // the velocity is equal to v_max
    else {
      this.state = "cruising";
    }
  }

  public moveToNextEdge(g: Graph): void {
    this.position = this.currentEdge?.v ?? "";
    this.distanceAlongEdge = 0;
    this.setEdgeFromPosition(g);
    //console.log("Time:", CUR_TIME.toFixed(0), ": service", this.service.serviceID, "at node", this.position);
  }

  public moveVehicle(timeStep: number, g: Graph): void {
    // console.log("Time:", CUR_TIME, ": service", this.service.serviceID, "at edge", this.currentEdge?.edgeID, "distance", this.distanceAlongEdge.toFixed(0), "velocity", this.velocity.toFixed(0));
    // start by making a tracker for the remaining time and then
    // itterate over, removing chunks of that time
    if (!this.currentEdge) {
      this.setEdgeFromPosition(g);
    }

    let remainingTime = timeStep;
    while (remainingTime > 0) {
      const remainingEdgeLen =
        (this.currentEdge?.len || 0) - this.distanceAlongEdge;
      const movementAuthority = this.getMovementAuthority(g);
      // determine the state of the service
      this.setState(movementAuthority);
      // find the distance travelled by the vehicle
      let { s_travelled, a, v_final } =
        this.findDistanceTravelledInTime(remainingTime);
      if (s_travelled >= remainingEdgeLen) {
        // find the time taken to travel to the end of the edge
        const timeToNode = this.findTimeToTravelDistance(remainingEdgeLen, a);
        // remove from remainingTime
        remainingTime = remainingTime - timeToNode;
        // find the speed at the node
        const { v_final: vAtNode } =
          this.findDistanceTravelledInTime(timeToNode);
        v_final = vAtNode;

        // check if it's reached a station
        if (this.nextStop === this.currentEdge?.v) {
          this.startDwell(remainingTime, g);
          remainingTime = 0; //startDwell will handle the remainingTime
        } else {
          // move to the next edge
          this.moveToNextEdge(g);
        }
      } else {
        // move along the edge
        this.distanceAlongEdge += s_travelled;
        // remove the time remaining
        remainingTime = 0;
      }
      // update the final speed (considering if the time has adjusted)
      this.velocity = v_final;
    }
  }
}
