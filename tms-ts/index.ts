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

    if (graphData.edges.length > 0 || graphData.nodes.length > 0) {
      this.addGraphData(graphData);
    }
  }

  public getEdgeKey(u: string, v: string): string {
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

    this.clearPathCache()

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
    this.precomputeAllShortestPaths();
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
    console.log("not a cached path");

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

  public clearPathCache(): void {
    this.shortestPathCache.clear();
  }

  public precomputeAllShortestPaths(): void {
    console.log("Precomputing all shortest paths...");
    for (const startNode of this.nodes) {
      const { distances, previous } = this.dijkstra(startNode.nodeID);
      for (const endNode of this.nodes) {
        const startId = startNode.nodeID;
        const endId = endNode.nodeID;
        if (startId === endId) continue;

        const key = this.getPathKey(startId, endId);
        if (this.shortestPathCache.has(key)) continue;

        const route: string[] = [];
        let current = endId;
        while (current !== null && current !== startId) {
          route.unshift(current);
          current = previous[current]!;
        }

        if (current === startId) {
          route.unshift(startId);
          this.shortestPathCache.set(key, { route, len: distances[endId] });
        }
      }
    }
    console.log(`Precomputed ${this.shortestPathCache.size} shortest paths.`);
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

  public findNextEdge(g: Graph): void{
    // use the current position and the route to the next stop to find the next edge
    // on that path

    const {route} = g.shortestPath(this.position, this.nextStop);
    
    if(route.length < 2){
      console.warn("current position is equal to next step, no edge to find");
    }else{
      const nextEdge = g.getEdge(route[0], route[1]);
      if(!nextEdge){
        console.warn(`Cannot find next edge, there is no edge from ${g.getEdgeKey(route[0], route[1])}`);
      }else{
        this.currentEdge = nextEdge;
        this.distanceAlongEdge = 0;
      }
    }

  }

  public startDwell(remainingTime: number, g:Graph): void{
    // set the vehicle to stationary
    this.velocity= 0;
    this.state= "stationary";
    
    // change the current node position of the vehicle
    this.position= this.nextStop;
    
    // find the index of the current position
    const curStopIndex= this.service.stops.findIndex(stop => stop.nodeID === this.position) ?? 0;
    const nextStopIndex = (curStopIndex + 1)% this.service.stops.length;

    // set the dwell time
    this.remainingDwell = this.service.stops[curStopIndex].t_dwell;
    // set the next stop
    this.nextStop = this.service.stops[nextStopIndex].nodeID;

    // update the current edge
    this.findNextEdge(g);
  }

  public advanceDwell(timeStep: number): void{
    this.remainingDwell -= timeStep;
    if (this.remainingDwell <= 0) {
      this.remainingDwell = 0;
      this.velocity = 0;
      this.state = "accelerating";
    }
  }

  public updatePosition(timeStep: number, graph: Graph): void{
    if(this.remainingDwell > 0){ // check if remainingdwell - timeStep < 0
      this.advanceDwell(timeStep);
    } else{
      this.moveVehicle(timeStep, graph);
    }
  }

  public moveVehicle(timeStep: number, g: Graph): void{
    // start by making a tracker for the remaining time and then 
    // itterate over, removing chunks of that time
    if(!this.currentEdge){
      this.findNextEdge(g);
    }
    
    let remainingTime= timeStep;
    while(remainingTime > 0){
      const remainingEdgeLen = this.currentEdge.len - this.distanceAlongEdge;
      const {len: distanceToNextStop} = g.shortestPath(this.position, this.nextStop) - this.distanceAlongEdge;

      console.log(distanceToNextStop+1)

      // determine the state of the service

      
      
    }
  }
}

class TransportMicroSimulator{
  graph: Graph;
  simServices: SimulationService[];
  log: SimLog[];

  constructor(graphData: GraphData, services: TransportService[]){
    console.log("building simulator basis");
    this.graph = new Graph(graphData);
    this.simServices = [];
    this.log = [];
    
    for(const s of services){
      const simService = new SimulationService(s);
      this.simServices.push(simService);
    }
  }

  public run(timeStep: number, duration: number): void{
    console.log("running simulation");
    for(let i = 0; i<(duration/timeStep); i++){
      console.log(`timeStep: ${(i*timeStep).toFixed(1)}s`);
      this.step(timeStep);
      this.logState(i*timeStep);
      this.simServices.forEach(v => console.log(
        v.position !== null && v.currentEdge
          ? `Vehicle ${v.service.serviceID} at ${v.distanceAlongEdge.toFixed(1)}m along edge ${v.currentEdge.edgeID} at speed ${v.velocity.toFixed(2)}`
          : v.position
          ? `Vehicle ${v.service.serviceID} at node ${v.position} at speed ${v.velocity.toFixed(2)} with remaining dwell ${v.remainingDwell.toFixed(1)}`
          : `Vehicle ${v.service.serviceID} is in an unknown state`
      ));
    }
  }

  public logState(timestamp: number):void {
    this.log.push({
      "time": timestamp,
      "services":this.simServices
    })
  }

  public step(timeStep: number): void{
    const newSimServices: SimulationService[] = [];

    for(const simService of this.simServices){

      simService.updatePosition(timeStep, this.graph);
      
      newSimServices.push(simService);
    }
    this.simServices = newSimServices;
  }
}

function timeToReachDistance(s: number, v_u: number, a: number): number{
  const min_speed = 0.001; // to prevent divide-by-zero
  let time: number = 0;

  if (a !== 0) {
    const dis = (v_u ** 2 )+ (2 * a * s);

    if (dis < 0) {
      // Not physically reachable with current parameters
      return s / Math.max(v_u, min_speed);
    }

    time = (-v_u + Math.sqrt(dis)) / a;

    // Time must be positive and real
    if (!(time > 0 && isFinite(time))) {
      time = s / Math.max(v_u, min_speed);
    }
  }
  return time;
}

function zeroPad(num: number, size=3): string{
  return num.toString().padStart(size, '0');
}

function createBasicLoopGraph(n_stn: number, s_is: number, s_stn: number): GraphData{
  const gData: GraphData = {"nodes":[], "edges":[]};

  for (let i=0; i< n_stn; i++){
    const stnID = `STN.${zeroPad(i+1)}`;
    const trkID = `TRK.${zeroPad(i+1)}`;

    // Add station node
    gData.nodes.push({
      nodeID: stnID,
      loc: { x: Math.cos((2 * Math.PI * i) / n_stn), y: Math.sin((2 * Math.PI * i) / n_stn) },
      type: "station",
    });

    // Add track node
    gData.nodes.push({
      nodeID: trkID,
      loc: { x: Math.cos((2 * Math.PI * (i + 0.5)) / n_stn), y: Math.sin((2 * Math.PI * (i + 0.5)) / n_stn) },
      type: "main",
    });

    // Edge from station to track
    gData.edges.push({
      edgeID: `E${zeroPad(gData.edges.length + 1)}`,
      u: stnID,
      v: trkID,
      len: s_stn/2,
    });

    // Edge from track to next station
    const nextStationId = `STN.${zeroPad((i + 1) % n_stn + 1)}`;
    gData.edges.push({
      edgeID: `E${zeroPad(gData.edges.length + 1)}`,
      u: trkID,
      v: nextStationId,
      len: s_is,
    });
  }
  
  return gData;
}

function saveGraphToFile(graph: Graph, filePath: string): void {
  const graphData = graph.toJSON();
  const jsonString = JSON.stringify(graphData, null, 2); // pretty-print with 2 spaces
  fs.writeFileSync(filePath, jsonString, 'utf8');
  console.log(`Graph saved to ${filePath}`);
}

function saveGraphToDrawIO(graph: Graph, filePath: string): void{
  //example from draw.io
  //;Example:
  //a->b
  //b->edge label->c
  //c->a

  const outputList: string[] = [";graph:"];

  for(const e of graph.edges){
    outputList.push(`${e.u}->${e.edgeID}(${e.len}m)->${e.v}`);
  }

  const outputString = outputList.join("\n");

  fs.writeFileSync(filePath, outputList.join("\n"), 'utf-8');
  console.log(`Graph saved to ${filePath}`);
}

function saveSimLogToFile(log: SimLog[], filePath: string): void {
  const jsonString = JSON.stringify(log, null, 2); // pretty-print with 2 spaces
  fs.writeFileSync(filePath, jsonString, 'utf8');
  console.log(`Graph saved to ${filePath}`);
}

const loopGraph = createBasicLoopGraph(20,2000,50);

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
      "nodeID": "STN.015",
      "t_dwell": 60
    }
  ],
  "serviceID":"SVC.001",
  "startNodeID":"STN.001",
  "vehicle":veh
}


const sim = new TransportMicroSimulator(loopGraph, [r])
saveGraphToDrawIO(sim.graph, `sim-outputs/graph-${Date.now()}`);
sim.run(1, 2000);

saveSimLogToFile(sim.log, `sim-outputs/simlog-${Date.now()}`);


//const { route, len } = graph.shortestPath('E', 'A'); // Find shortest path from node "A"
//console.log(route); // Shortest distances from node A
//console.log(len); // Previous nodes to reconstruct paths
