import {
  TransportService,
  SimulationState,
  SegmentSection,
  StopManager,
} from "./models";
import { GraphEdge, GraphPosition } from "../graph/models";
import { Graph } from "../graph/Graph";
import {
  findNextStop,
  findStopIndex,
  projectDistanceTravelled,
} from "../utils/helpers";

export class SimulationService {
  service: TransportService;

  currentPosition: GraphPosition;
  nextStop: string; //nodeID for the next stop

  state: SimulationState;
  velocity: number;
  remainingDwell: number;

  stopManager: StopManager;

  constructor(service: TransportService, g: Graph) {
    this.service = service;

    if (service.startNodeID === service.stops[0].nodeID) {
      this.nextStop = service.stops[1].nodeID;
    } else {
      this.nextStop = service.stops[0].nodeID;
    }

    this.velocity = 0;
    this.state = "stationary";

    this.remainingDwell = 0;
    this.stopManager = {};

    // find the next node
    const route: string[] = g.getShortestPath(
      service.startNodeID,
      this.nextStop
    ).route;

    // find the edge
    let e: GraphEdge | undefined = g.getEdge(service.startNodeID, route[0]);

    if (!e) {
      new TypeError("Invalid Route");
      e = {
        edgeID: "",
        len: 0,
        u: "",
        v: "",
      };
    }
    this.currentPosition = {
      distanceAlongEdge: 0,
      edge: e,
    };
  }

  public startDwell(remainingTime: number, g: Graph): void {
    // set the vehicle to stationary
    this.stopManager[this.nextStop] = true;
    this.velocity = 0;
    this.state = "stationary";

    // find the index of the current position
    const currentStopID = this.currentPosition.edge.v;
    const nStop = findNextStop(currentStopID, this.service.stops);
    this.nextStop = nStop.nodeID;
    this.remainingDwell = nStop.t_dwell - remainingTime;
    // move to the next edge
    const nextEdge = g.getNextEdge(currentStopID, this.nextStop);
    if (!nextEdge) {
      console.warn("Cannot find next edge at dwell");
    } else {
      this.currentPosition = { edge: nextEdge, distanceAlongEdge: 0 };
    }
  }

  public advanceDwell(timeStep: number): void {
    this.remainingDwell -= timeStep;
    if (this.remainingDwell <= 0) {
      this.stopManager[this.nextStop] = false;
      this.remainingDwell = 0;
      this.velocity = 0;
      this.state = "accelerating";
      console.log(
        `Service ${this.service.serviceID} (${this.service.vehicle.name}) departing from stop ${this.currentPosition.edge.u}`
      );
    }
  }

  public updatePosition(
    timeStep: number,
    graph: Graph,
    maSegments: SegmentSection[],
    stopManager: StopManager
  ): { stopManager: StopManager } {
    this.stopManager = stopManager;
    if (this.remainingDwell > 0) {
      // check if remainingdwell - timeStep < 0
      this.advanceDwell(timeStep);
    } else {
      this.moveVehicle(timeStep, graph, maSegments);
    }
    return { stopManager: this.stopManager };
  }

  public findTimeToTravelDistance(s: number, a: number): number {
    const v_u = Math.max(0.001, this.velocity); // prevent divide by zero error
    let t = 0;

    const dis = this.velocity ** 2 + 2 * a * s;

    if (dis < 0) {
      return s / v_u;
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
        a = -this.service.vehicle.a_dcc;
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

  public getBrakingDistance(): number {
    return this.velocity ** 2 / (2 * this.service.vehicle.a_dcc);
  }

  public setState(maSegments: SegmentSection[], timeStep: number): void {
    const buffer = 0.5;
    const s_ma = maSegments.reduce(
      (acc, seg) => acc + (seg.end - seg.start),
      0
    );

    // find the braking distance if it accelerated over the next timestep
    const s_nextStepMax = projectDistanceTravelled(
      this.velocity,
      this.service.vehicle.a_acc,
      this.service.vehicle.a_dcc,
      timeStep
    );
    // find the braking distance if it cruised over the next timestep
    const s_nextStepCruise = projectDistanceTravelled(
      this.velocity,
      0,
      this.service.vehicle.a_dcc,
      timeStep
    );

    // is it authorised to accelerate
    if (s_nextStepMax <= s_ma && this.velocity < this.service.vehicle.v_max) {
      this.state = "accelerating";
    } else if (this.velocity === 0) {
      this.state = "stationary";
    } else if (s_nextStepCruise <= s_ma) {
      this.state = "cruising";
    } else {
      this.state = "decelerating";
    }
  }

  public moveVehicle(
    timeStep: number,
    g: Graph,
    maSegments: SegmentSection[]
  ): void {
    // determine the state of the service
    this.setState(maSegments, timeStep);

    // find the distance travelled by the vehicle
    const { s_travelled, a, v_final } =
      this.findDistanceTravelledInTime(timeStep);
    // find the distance to reach the next stop
    const s_nextStop = g.getDistanceToNode(this.currentPosition, this.nextStop);
    if (s_nextStop <= s_travelled) {
      // find the time to travel to the station
      const t_stop = this.findTimeToTravelDistance(s_nextStop, a);
      if (this.stopManager[this.nextStop]) {
        this.velocity = 0;
        this.state = "stationary";
      } else {
        this.startDwell(timeStep - t_stop, g);
      }
    } else {
      // find the position travelled to
      this.currentPosition = g.getForwardPosition(
        this.currentPosition,
        this.service.stops,
        this.nextStop,
        s_travelled
      );
      this.velocity = v_final;
    }
  }

  public calculateProposedMA(graph: Graph, timeStep: number): SegmentSection[] {
    // find the highest possible velcity after the next timestep
    const v_nextStep = Math.min(
      this.velocity + this.service.vehicle.a_acc * timeStep * 2,
      this.service.vehicle.v_max
    );
    // find the maximum possible distance travelled in the next timestep
    const s_nextStep = timeStep * 2 * ((v_nextStep + this.velocity) / 2);
    // find the braking distance from the new velocity
    const s_nextBrake = v_nextStep ** 2 / (2 * this.service.vehicle.a_dcc);
    const s_projected = s_nextStep + s_nextBrake;
    // find the distance to the next service stop
    const s_nextStop = graph.getDistanceToNode(
      this.currentPosition,
      this.nextStop
    );

    const s_ma = Math.min(s_nextStop, s_projected);

    const maSegments = graph.getSegmentsAlongPath(
      this.currentPosition,
      this.service.stops,
      this.nextStop,
      s_ma
    );

    return maSegments;
  }
}
