import { create } from 'domain';
import fs from 'fs';
import path from 'path';

interface Coordinate{
  x: number;
  y: number;
}

type SimulationState= "stationary" | "accelerating" | "decelerating" | "cruising"

interface GraphNode{
  loc: Coordinate;
  nodeID: string;
  type: "main" | "station" | "side";
}

interface GraphEdge{
  edgeID: string;
  u: string;
  v: string;
  len: number;
  parentEdge?: string;
}

interface GraphData{
  nodes: GraphNode[];
  edges: GraphEdge[];
  
}

class Graph{
  edges: GraphEdge[];
  nodes: GraphNode[];
  private edgeMap: Map<string, GraphEdge>;
  private shortestPathCache: Map<string, { route: string[], len: number }>


  constructor(graphData: GraphData = {"edges":[], "nodes":[]}){
    this.edges = [];
    this.nodes = [];
    this.edgeMap = new Map();
    this.shortestPathCache = new Map();
  }

  private getEdgeKey(u: string, v: string): string {
    return `${u}->${v}`;
  }

  private getPathKey(start: string, end: string): string {
    return `${start}->${end}`;
  }

  private checkNodeExistance(nodeId: string): boolean {
    return this.nodes.some(existingNode=>existingNode.nodeID === nodeId);
  }

  private checkEdgeExistance(edgeId: string): boolean {
    return this.edges.some(existingEdge=>existingEdge.edgeID === edgeId);
  }

  public addNode(newNode: GraphNode): boolean {
    const uniqueNode = !this.checkNodeExistance(newNode.nodeID);

    if(uniqueNode){
      this.nodes.push(newNode);
      console.log(`Node with id ${newNode.nodeID} added.`);
    }else{
      console.log(`Node with id ${newNode.nodeID} already exists.`);
    }
    return uniqueNode;
  }

  public addEdge(newEdge: GraphEdge): boolean {
    const validNodes = this.checkNodeExistance(newEdge.u) && this.checkNodeExistance(newEdge.v);
    const uniqueEdge = !this.checkEdgeExistance(newEdge.edgeID);

    if (uniqueEdge && validNodes) {
      this.edges.push(newEdge);
      this.edgeMap.set(this.getEdgeKey(newEdge.u, newEdge.v), newEdge);
      console.log(`Edge with id ${newEdge.edgeID} added.`);
    } else if(!uniqueEdge){
      console.log(`Edge with id ${newEdge.edgeID} already exists.`);
    } else {
      if (!this.checkNodeExistance(newEdge.u)) {
        console.log(`Node with id ${newEdge.u} does not exist.`);
      } else{
        console.log(`Node with id ${newEdge.v} does not exist.`);
      }
    }

    return uniqueEdge && validNodes;
  }

  public getEdge(u: string, v: string): GraphEdge | undefined {
    return this.edgeMap.get(this.getEdgeKey(u, v));
  }

  public addEdgeList(edgeList: GraphEdge[]): void {
    for(let newEdge of edgeList){
      this.addEdge(newEdge);
    }
  }

  public addNodeList(nodeList: GraphNode[]): void {
    for(let newNode of nodeList){
      this.addNode(newNode);
    }
  }

  public addGraphData(graphData: GraphData): void{
    console.log("adding graph data");
    this.addNodeList(graphData.nodes);
    this.addEdgeList(graphData.edges);
    console.log("graph data added");
  }

  public dijkstra(startNodeId: string): {distances: Record<string, number>, previous: Record<string, string | null>}{
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const visited: Set<string> = new Set();

    // Initialise all distances to inifinty, exect start node
    for(const n of this.nodes){
      distances[n.nodeID] = Infinity;
      previous[n.nodeID] = null;
    }
    distances[startNodeId] = 0;

    while (visited.size < this.nodes.length){
      //find the unvisited node with the smallest distance
      let currentNodeId: string | null = null;
      let minDistance = Infinity;

      for (const n of this.nodes){
        if (!visited.has(n.nodeID) && distances[n.nodeID] < minDistance){
          minDistance = distances[n.nodeID];
          currentNodeId = n.nodeID;
        }
      }

      if (currentNodeId === null) break;

      visited.add(currentNodeId);

      // outgoing edges from current node
      for (const e of this.edges){
        if (e.u === currentNodeId){
          const vId = e.v;

          if(!visited.has(vId)){
            const newDist = distances[currentNodeId] + e.len;

            if (newDist < distances[vId]){
              distances[vId] = newDist;
              previous[vId] = currentNodeId
            }
          }
        }
      }
    }

    return {distances, previous};
  }

  public shortestPath(start: string, end: string): { route: string[], len: number } {
    const key = this.getPathKey(start, end);
    const cached = this.shortestPathCache.get(key);
    if (cached) return cached;

    const { distances, previous } = this.dijkstra(start);

    const route: string[] = [];
    let current = end;
    while (current !== null && current !== start) {
      route.unshift(current);
      current = previous[current]!;
    }

    if (current === start) {
      route.unshift(start);
      const result = { route, len: distances[end] };
      this.shortestPathCache.set(key, result);
      return result;
    }

    return { route: [], len: Infinity };
  }

  public toJSON(): GraphData{
    return {
      nodes: this.nodes,
      edges: this.edges
    };
  }

}

interface RouteStop{
  nodeID: string; // nodeID for the stop
  t_dwell: number; // dwell time at stop (s)
}

interface TransportService{
  serviceID: string;
  startNodeID: string; // startNodeID
  stops: RouteStop[]; // stops to make (this will be cyclical A->B->C->A...)
  vehicle: VehicleClass;
}

interface VehicleClass{
  name: string;
  a_acc: number; // acceleration rate (m/s/s)
  a_dcc: number; // deceleration rate (m/s/s)
  v_max: number; // maximum speed (m/s)
}

interface SimLog{
  time: number;
  services: SimulationService[];
}

class SimulationService{
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

  constructor(service: TransportService){
    this.service = service;
    this.position = service.startNodeID;
    if(service.startNodeID === service.stops[0].nodeID){
      this.nextStop = service.stops[1].nodeID;
    }else{
      this.nextStop = service.stops[0].nodeID;
    }

    this.velocity = 0;
    this.state = "stationary";

    this.s_acc = (this.service.vehicle.v_max ** 2)/(2 * this.service.vehicle.a_acc);
    this.s_dcc = (this.service.vehicle.v_max ** 2)/(2 * this.service.vehicle.a_dcc);

    this.remainingDwell = 0;
    this.distanceAlongEdge = 0;
    this.currentEdge = undefined;
  }

  public advanceDwell(timeStep: number): void{
    this.remainingDwell -= timeStep;
    if (this.remainingDwell <= 0) {
      this.remainingDwell = 0;
      this.velocity = this.service.vehicle.v_max;
      this.state = "cruising";
    }
  }

  public startDwell(): void{
    this.position = this.nextStop;
    this.velocity = 0;
    this.state = "stationary";
    this.currentEdge = undefined;
    this.distanceAlongEdge = 0;

    const stopIndex = this.service.stops.findIndex(stop => stop.nodeID === this.position) ?? 0;

    // set the dwell time
    this.remainingDwell = this.service.stops[stopIndex].t_dwell;

    // find the new nextStop
    this.nextStop = this.service.stops[(stopIndex + 1) % this.service.stops.length].nodeID;

  }
}

class TransportMicroSimulator{
  graph: Graph;
  simServices: SimulationService[];
  timeStep: number;
  duration: number;
  log: SimLog[];

  constructor(graphData: GraphData, services: TransportService[], quantizeLen: number, timeStep: number, duration: number){
    console.log("building simulator basis");
    this.graph = new Graph(graphData);
    this.timeStep = timeStep;
    this.simServices = [];
    this.duration = duration
    this.log = [];
    
    for(const s of services){
      const simService = new SimulationService(s);
      this.simServices.push(simService);
    }
  }

  public run(): void{
    console.log("running simulation");
    for(let i = 0; i<(this.duration/this.timeStep); i++){
      this.step();
      this.logState(i*this.timeStep);
    }
  }

  public logState(timestamp: number):void {
    this.log.push({
      "time": timestamp,
      "services":this.simServices
    })
  }

  public step(): void{
    console.log("stepping");
    const newSimServices: SimulationService[] = [];

    for(const simService of this.simServices){

      // Case 1: stationary
      if(simService.remainingDwell > 0){
        console.log("dwelling");
        simService.advanceDwell(this.timeStep); // if timestep is greater than remaining dwell then nothing extra will happen
        continue;
      }

      // Case 2: cruising
      console.log("cruising")
      const vehicle = simService.service.vehicle;
      const speed = vehicle.v_max;
      const distToTravel = speed * this.timeStep;

      let remainingDist = distToTravel;

      while(remainingDist>0){
        console.log(`remaining distance - ${remainingDist}`);
        if(!simService.currentEdge){
          console.log("no current edge")
          const {route} = this.graph.shortestPath(simService.position, simService.nextStop);
          console.log("route found")
          if(route.length<2){
            simService.startDwell;
            break;
          }

          const nextEdge = this.graph.getEdge(route[0], route[1]);
          if(!nextEdge){
            console.warn("Missing edge:", route[0], "->", route[1]);
            break;
          }

          simService.currentEdge = nextEdge;
          simService.distanceAlongEdge = 0;

          console.log(`new edge found ${simService.currentEdge.edgeID}`)
        }

        const edge = simService.currentEdge;
        const remainingEdgeLength = edge.len - simService.distanceAlongEdge;

        if (remainingDist >= remainingEdgeLength) {
          // Finish this edge
          remainingDist -= remainingEdgeLength;
          simService.position = edge.v;
          simService.currentEdge = undefined;
          simService.distanceAlongEdge = 0;

          if (edge.v === simService.nextStop) {
            simService.startDwell();
            break;
          }
        } else {
          // Still moving on current edge
          simService.distanceAlongEdge += remainingDist;
          remainingDist = 0;
        }
      }

      simService.velocity = speed;
      simService.state = "cruising";
          console.log(
        `${vehicle.name} [${simService.service.serviceID}] at node ${simService.position} ` +
        (simService.currentEdge
          ? `on edge ${simService.currentEdge.edgeID}, ${simService.distanceAlongEdge.toFixed(2)}m`
          : `stationary at stop`)
      );
    }
  }
}

function zeroPad(num: number, size=3): string{
  return num.toString().padStart(size, '0');
}

function createBasicLoopGraph(): GraphData{
  const n_stn = 20;
  const s_is = 2000;
  const s_stn = 100;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (let i=0; i< n_stn; i++){
    const stnID = `STN.${zeroPad(i+1)}`;
    const trkID = `TRK.${zeroPad(i+1)}`;

    // Add station node
    nodes.push({
      nodeID: stnID,
      loc: { x: Math.cos((2 * Math.PI * i) / n_stn), y: Math.sin((2 * Math.PI * i) / n_stn) },
      type: "station",
    });

    // Add track node
    nodes.push({
      nodeID: trkID,
      loc: { x: Math.cos((2 * Math.PI * (i + 0.5)) / n_stn), y: Math.sin((2 * Math.PI * (i + 0.5)) / n_stn) },
      type: "main",
    });

    // Edge from station to track
    edges.push({
      edgeID: `E${zeroPad(edges.length + 1)}`,
      u: stnID,
      v: trkID,
      len: s_stn/2,
    });

    // Edge from track to next station
    const nextStationId = `STN.${zeroPad((i + 1) % n_stn + 1)}`;
    edges.push({
      edgeID: `E${zeroPad(edges.length + 1)}`,
      u: trkID,
      v: nextStationId,
      len: s_is,
    });
  }
  
  return { nodes, edges };
}

function saveGraphToFile(graph: Graph, filePath: string): void {
  const graphData = graph.toJSON();
  const jsonString = JSON.stringify(graphData, null, 2); // pretty-print with 2 spaces
  fs.writeFileSync(filePath, jsonString, 'utf8');
  console.log(`Graph saved to ${filePath}`);
}

function saveSimLogToFile(log: SimLog[], filePath: string): void {
  const jsonString = JSON.stringify(log, null, 2); // pretty-print with 2 spaces
  fs.writeFileSync(filePath, jsonString, 'utf8');
  console.log(`Graph saved to ${filePath}`);
}

const loopGraph = createBasicLoopGraph();

const veh: VehicleClass = {
  "a_acc": 1,
  "a_dcc": 1,
  "v_max": 80,
  "name": "bus"
}

const r: TransportService = {
  "stops": [
    {
      "nodeID": "STN.001",
      "t_dwell": 60
    },{
      "nodeID": "STN.005",
      "t_dwell": 60
    },{
      "nodeID": "STN.010",
      "t_dwell": 60
    },{
      "nodeID": "STN.15",
      "t_dwell": 60
    }
  ],
  "serviceID":"SVC.001",
  "startNodeID":"STN.001",
  "vehicle":veh
}

const sim = new TransportMicroSimulator(loopGraph, [r], 1,2,200)
sim.run();

saveSimLogToFile(sim.log, `sim-outputs/simlog-${Date.now()}`);


//const { route, len } = graph.shortestPath('E', 'A'); // Find shortest path from node "A"
//console.log(route); // Shortest distances from node A
//console.log(len); // Previous nodes to reconstruct paths
