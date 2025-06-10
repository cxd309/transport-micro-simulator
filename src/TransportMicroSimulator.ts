type MovementAuthority = SegmentSection[];
type MovementAuthorityRecord = Record<string, MovementAuthority>;
type StopManager = Record<string, boolean>;
type SimulationState =
  | "stationary"
  | "dwelling"
  | "accelerating"
  | "decelerating"
  | "cruising";

interface Coordinate {
  x: number;
  y: number;
}

interface GraphEdge {
  edgeID: string;
  u: string;
  v: string;
  len: number;
  parentEdge?: string;
}

interface GraphNode {
  loc: Coordinate;
  nodeID: string;
  type: "main" | "station" | "side";
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphPosition {
  edge: GraphEdge;
  distanceAlongEdge: number;
}

interface RouteStop {
  nodeID: string; // nodeID for the stop
  t_dwell: number; // dwell time at stop (s)
}

interface TransportService {
  serviceID: string;
  startNodeID: string; // startNodeID
  stops: RouteStop[]; // stops to make (this will be cyclical A->B->C->A...)
  vehicle: VehicleClass;
}

interface VehicleClass {
  name: string;
  a_acc: number; // acceleration rate (m/s/s)
  a_dcc: number; // deceleration rate (m/s/s)
  v_max: number; // maximum speed (m/s)
}

interface SimulationServiceLog {
  serviceID: string;
  vehicleClassName: string;
  currentPosition: GraphPosition;
  nextStop: string;
  state: SimulationState;
  velocity: number;
  remainingDwell: number;
}

interface SimulationLog {
  time: number;
  services: SimulationServiceLog[];
}

interface SimulatorParameters {
  simID: string;
  runTime: number;
  timeStep: number;
  graphData: GraphData;
  services: TransportService[];
}

class SegmentSection {
  constructor(
    public edge: GraphEdge,
    public start: number,
    public end: number
  ) {}

  getLength(): number {
    return this.end - this.start;
  }

  clone(): SegmentSection {
    return new SegmentSection(this.edge, this.start, this.end);
  }
}

class Graph {
  edges: GraphEdge[];
  nodes: GraphNode[];
  private edgeMap: Map<string, GraphEdge>;
  private shortestPathCache: Map<string, { route: string[]; len: number }>;

  constructor(graphData: GraphData = { edges: [], nodes: [] }) {
    this.edges = [];
    this.nodes = [];
    this.edgeMap = new Map();
    this.shortestPathCache = new Map();

    if (graphData.edges.length > 0 || graphData.nodes.length > 0) {
      this.addGraphData(graphData);
    }
  }

  public getEdge(u: string, v: string): GraphEdge | undefined {
    return this.edgeMap.get(this.getEdgeKey(u, v));
  }

  public getEdgeKey(u: string, v: string): string {
    return `${u}->${v}`;
  }

  public getPathKey(start: string, end: string): string {
    return `${start}->${end}`;
  }

  private checkNodeExistance(nodeId: string): boolean {
    return this.nodes.some((existingNode) => existingNode.nodeID === nodeId);
  }

  private checkEdgeExistance(edgeId: string): boolean {
    return this.edges.some((existingEdge) => existingEdge.edgeID === edgeId);
  }

  private addNode(newNode: GraphNode): boolean {
    const uniqueNode = !this.checkNodeExistance(newNode.nodeID);

    if (uniqueNode) {
      this.nodes.push(newNode);
    } else {
      console.warn(`Node with id ${newNode.nodeID} already exists.`);
    }
    return uniqueNode;
  }

  private addEdge(newEdge: GraphEdge): boolean {
    const validNodes =
      this.checkNodeExistance(newEdge.u) && this.checkNodeExistance(newEdge.v);
    const uniqueEdge = !this.checkEdgeExistance(newEdge.edgeID);

    if (uniqueEdge && validNodes) {
      this.edges.push(newEdge);
      this.edgeMap.set(this.getEdgeKey(newEdge.u, newEdge.v), newEdge);
    } else if (!uniqueEdge) {
      console.warn(`Edge with id ${newEdge.edgeID} already exists.`);
    } else {
      if (!this.checkNodeExistance(newEdge.u)) {
        console.warn(`Node with id ${newEdge.u} does not exist.`);
      } else {
        console.warn(`Node with id ${newEdge.v} does not exist.`);
      }
    }

    return uniqueEdge && validNodes;
  }

  private addEdgeList(edgeList: GraphEdge[]): void {
    for (let newEdge of edgeList) {
      this.addEdge(newEdge);
    }
  }

  private addNodeList(nodeList: GraphNode[]): void {
    for (let newNode of nodeList) {
      this.addNode(newNode);
    }
  }

  public addGraphData(graphData: GraphData): void {
    console.log("adding graph data");
    this.clearPathCache();
    this.addNodeList(graphData.nodes);
    this.addEdgeList(graphData.edges);
    this.setShortestPathCache();
  }

  private floydWarshall(): {
    distances: Record<string, Record<string, number>>;
    next: Record<string, Record<string, string | null>>;
  } {
    const nodeIDList = this.nodes.map((n) => n.nodeID);
    const distances: Record<string, Record<string, number>> = {};
    const next: Record<string, Record<string, string | null>> = {};

    // initialise distances and next
    for (const i of nodeIDList) {
      distances[i] = {};
      next[i] = {};
      for (const j of nodeIDList) {
        distances[i][j] = i === j ? 0 : Infinity;
        next[i][j] = null;
      }
    }

    // set the edge weights
    for (const e of this.edges) {
      distances[e.u][e.v] = e.len;
      next[e.u][e.v] = e.v;
    }

    // Floyd-Warshall
    for (const k of nodeIDList) {
      for (const i of nodeIDList) {
        for (const j of nodeIDList) {
          if (distances[i][k] + distances[k][j] < distances[i][j]) {
            distances[i][j] = distances[i][k] + distances[k][j];
            next[i][j] = next[i][k];
          }
        }
      }
    }

    return { distances, next };
  }

  private reconstructPath(
    u: string,
    v: string,
    next: Record<string, Record<string, string | null>>
  ): string[] {
    if (next[u][v] === null) return [];
    const route: string[] = [];
    while (u !== v) {
      u = next[u][v]!;
      route.push(u);
    }
    return route;
  }

  private setShortestPathCache(): void {
    // use the Floyd-Warshall algorithm
    const nodeIDList = this.nodes.map((n) => n.nodeID);
    const { distances, next } = this.floydWarshall();
    this.shortestPathCache = new Map();
    for (const i of nodeIDList) {
      for (const j of nodeIDList) {
        if (i !== j && distances[i][j] !== Infinity) {
          const path = this.reconstructPath(i, j, next);
          this.shortestPathCache.set(this.getPathKey(i, j), {
            route: path,
            len: distances[i][j],
          });
        }
      }
    }
  }

  public getShortestPath(
    start: string,
    end: string
  ): { route: string[]; len: number } {
    const key = this.getPathKey(start, end);
    const cached = this.shortestPathCache.get(key);
    if (cached) {
      return cached;
    } else {
      console.warn(
        key,
        "is not a cached path, this means it is probably not a valid path or shortestPathCache need to be rebuilt"
      );
      return { route: [], len: Infinity };
    }
  }

  public toJSON(): GraphData {
    return {
      nodes: this.nodes,
      edges: this.edges,
    };
  }

  public clearPathCache(): void {
    this.shortestPathCache.clear();
  }

  public getNextEdge(u: string, v: string): GraphEdge | undefined {
    const { route } = this.getShortestPath(u, v);

    if (route.length < 1) {
      console.warn("getNextEdge: u is equal to v, no edge to find");
      return;
    }
    return this.getEdge(u, route[0]);
  }

  public getDistanceToNode(currentPosition: GraphPosition, targetNode: string) {
    const { len } = this.getShortestPath(currentPosition.edge.u, targetNode);

    return len - currentPosition.distanceAlongEdge;
  }

  public getForwardPosition(
    currentPosition: GraphPosition,
    stops: RouteStop[],
    nextStop: string,
    s_total: number
  ): GraphPosition {
    const segments = this.getSegmentsAlongPath(
      currentPosition,
      stops,
      nextStop,
      s_total
    );

    if (segments.length === 0) {
      return currentPosition;
    }
    const lastSegment = segments[segments.length - 1];
    return {
      edge: lastSegment.edge,
      distanceAlongEdge: lastSegment.end,
    };
  }

  public getSegmentsAlongPath(
    startPosition: GraphPosition,
    stops: RouteStop[],
    nextStop: string,
    s_total: number
  ): SegmentSection[] {
    let currentPosition = { ...startPosition };
    const segments: SegmentSection[] = [];
    let s_remaining = s_total;
    while (s_remaining > 0) {
      const edgeDistanceRemaining =
        currentPosition.edge.len - currentPosition.distanceAlongEdge;

      const segmentLength = Math.min(s_remaining, edgeDistanceRemaining);
      const segmentStart = currentPosition.distanceAlongEdge;
      const segmentEnd = segmentStart + segmentLength;
      segments.push(
        new SegmentSection(currentPosition.edge, segmentStart, segmentEnd)
      );
      if (s_remaining >= edgeDistanceRemaining) {
        //find the next edge to move onto
        if (currentPosition.edge.v === nextStop) {
          nextStop = findNextStop(currentPosition.edge.v, stops).nodeID;
        }
        const nextEdge = this.getNextEdge(currentPosition.edge.v, nextStop);
        if (!nextEdge) {
          console.warn("Cannot find next edge");
          break;
        } else {
          currentPosition = {
            distanceAlongEdge: 0,
            edge: nextEdge,
          };
          s_remaining -= edgeDistanceRemaining;
          if (s_remaining === 0) {
            segments.push(new SegmentSection(currentPosition.edge, 0, 0));
          }
        }
      } else {
        currentPosition.distanceAlongEdge += s_remaining;
        s_remaining = 0;
      }
    }
    return segments;
  }
}

export class TransportMicroSimulator {
  graph: Graph;
  simServices: Record<string, SimulationService>;
  simTime: number;
  maRecord: MovementAuthorityRecord;
  stopManager: StopManager;
  simLog: SimulationLog[];
  runTime: number;
  timeStep: number;

  constructor(params: SimulatorParameters) {
    console.log("building simulator basis");
    this.graph = new Graph(params.graphData);
    this.simServices = {};
    this.simTime = 0;
    this.maRecord = {};
    this.stopManager = {};
    this.simLog = [];
    this.runTime = params.runTime;
    this.timeStep = params.timeStep;

    for (const s of params.services) {
      const simService = new SimulationService(s, this.graph);
      const serviceID = simService.service.serviceID;
      this.simServices[serviceID] = simService;
      this.maRecord[serviceID] = [];
    }

    for (const n of this.graph.nodes) {
      this.stopManager[n.nodeID] = false;
    }
  }

  public run(
    timeStep: number = this.timeStep,
    runTime: number = this.runTime
  ): SimulationLog[] {
    console.log("running simulation");
    for (let i = 0; i < runTime / timeStep; i++) {
      this.step(timeStep);
    }
    console.log("simulation complete");
    return this.simLog;
  }

  public getSimLog(): SimulationLog {
    const simLog: SimulationLog = {
      time: this.simTime,
      services: [],
    };

    for (const [serviceID, simService] of Object.entries(this.simServices)) {
      const serviceLog: SimulationServiceLog = {
        serviceID: serviceID,
        vehicleClassName: simService.service.vehicle.name,
        currentPosition: simService.currentPosition,
        nextStop: simService.nextStop,
        state: simService.state,
        velocity: simService.velocity,
        remainingDwell: simService.remainingDwell,
      };

      simLog.services.push(serviceLog);
    }

    return simLog;
  }

  public step(timeStep: number): SimulationLog {
    this.simTime += timeStep;

    for (const [serviceID, simService] of Object.entries(this.simServices)) {
      const proposedMASegments = simService.calculateProposedMA(
        this.graph,
        timeStep
      );

      const grantedMASegments = truncateMA(
        proposedMASegments,
        this.maRecord,
        serviceID
      );

      this.maRecord[serviceID] = grantedMASegments;

      const { stopManager: newSM } = simService.updatePosition(
        timeStep,
        this.graph,
        grantedMASegments,
        this.stopManager
      );

      this.stopManager = newSM;

      this.simServices[serviceID] = simService;
    }
    const log: SimulationLog = this.getSimLog();
    this.simLog.push(log);
    return log;
  }
}

class SimulationService {
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
    this.state = "dwelling";

    // find the index of the current position
    const currentStopID = this.currentPosition.edge.v;
    const nStop = findNextStop(currentStopID, this.service.stops);
    this.nextStop = nStop.nodeID;
    this.remainingDwell = nStop.t_dwell - Math.max(remainingTime, 0);
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
      this.stopManager[this.currentPosition.edge.u] = false;
      this.remainingDwell = 0;
      this.velocity = 0;
      this.state = "accelerating";
    }
  }

  public updatePosition(
    timeStep: number,
    graph: Graph,
    maSegments: SegmentSection[],
    stopManager: StopManager
  ): { stopManager: StopManager } {
    this.stopManager = { ...stopManager };
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
    } else if (
      this.velocity === 0 &&
      s_ma > 0 &&
      !this.stopManager[this.nextStop]
    ) {
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

  public calculateProposedMA(
    graph: Graph,
    timeStep: number
  ): MovementAuthority {
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

function findStopIndex(nodeID: string, stops: RouteStop[]): number {
  return stops.findIndex((stop) => stop.nodeID === nodeID) ?? 0;
}

function findNextStop(currentNodeID: string, stops: RouteStop[]): RouteStop {
  const curStopIndex = findStopIndex(currentNodeID, stops);
  const nextStopIndex = (curStopIndex + 1) % stops.length;
  return stops[nextStopIndex];
}

function truncateMA(
  proposedMA: MovementAuthority,
  currentMArecord: MovementAuthorityRecord,
  serviceID: string
): MovementAuthority {
  let earliestConflictDistance = Infinity;

  let currentDistance = 0;

  for (const proposedSeg of proposedMA) {
    for (const [otherID, currentMA] of Object.entries(currentMArecord)) {
      if (otherID === serviceID) continue;
      for (const currentSegment of currentMA) {
        const conflictStart = getSegmentConflict(proposedSeg, currentSegment);
        if (conflictStart === undefined) continue;
        const conflictDistanceFromStart =
          currentDistance + (conflictStart - currentSegment.start);
        earliestConflictDistance = Math.min(
          conflictDistanceFromStart,
          earliestConflictDistance
        );
      }
    }
    currentDistance += proposedSeg.getLength();
  }

  if (earliestConflictDistance === Infinity) return proposedMA;

  const truncated: MovementAuthority = [];
  let s_accum = 0;

  for (const seg of proposedMA) {
    const segLen = seg.getLength();

    if (s_accum + segLen < earliestConflictDistance) {
      truncated.push(seg.clone());
      s_accum += segLen;
    } else {
      const allowedEnd = seg.start + (earliestConflictDistance - s_accum);
      truncated.push(new SegmentSection(seg.edge, seg.start, allowedEnd));
      break;
    }
  }
  return truncated;
}

function projectDistanceTravelled(
  v_current: number,
  a_acc: number,
  a_dcc: number,
  timeStep: number
): number {
  const v_final = v_current + a_acc * timeStep;
  const s_step = timeStep * ((v_current + v_final) / 2);
  const s_brake = v_final ** 2 / (2 * a_dcc);
  return s_step + s_brake;
}

function getSegmentConflict(
  a: SegmentSection,
  b: SegmentSection
): number | void {
  if (a.edge.edgeID === b.edge.edgeID && a.start < b.end && b.start < a.end) {
    return Math.max(a.start, b.start);
  } else {
    return;
  }
}
