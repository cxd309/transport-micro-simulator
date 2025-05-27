import { create } from 'domain';
import fs from 'fs';
import path from 'path';

interface Coordinate{
  x: number;
  y: number;
}

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

  constructor(){
    this.edges = [];
    this.nodes = [];
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
    this.addNodeList(graphData.nodes);
    this.addEdgeList(graphData.edges);
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

  public shortestPath(uNodeId: string, vNodeId: string): {route: string[], len: number}{
    const {distances, previous} = this.dijkstra(uNodeId);

    const route: string[] = [];
    let len: number = Infinity;


    if (distances[vNodeId] === Infinity) {
      console.log(`No path exists from ${uNodeId} to ${vNodeId}.`);
      return { route: route, len: len };
    }else{
      let currentNodeId: string | null = vNodeId;
      len = distances[vNodeId]

      while(currentNodeId){
        route.unshift(currentNodeId);
        currentNodeId = previous[currentNodeId];
      }
    }
    return {route, len};
  }

  public subdivideGraph(quantizeLen: number): Graph{
    const newGraph = new Graph;

    newGraph.addNodeList(this.nodes);

    let subNodeCount = 0;
    let subEdgeCount = 0;

    for (const e of this.edges){
      const {u, v, len, edgeID} = e;

      if (len <= quantizeLen){
        newGraph.addEdge({
          "edgeID": edgeID,
          "len": quantizeLen,
          "u": u,
          "v": v
        });
        continue;
      }
      
      const uNode = this.nodes.find(n => n.nodeID === u);
      const vNode = this.nodes.find(n=> n.nodeID === v);

      if (!uNode || !vNode) {
        console.warn(`Edge ${e.edgeID} refers to non-existent nodes.`);
        continue;
      }

      const n_subedges = Math.ceil(len / quantizeLen);

      const dx = (vNode.loc.x - uNode.loc.x)/n_subedges;
      const dy = (vNode.loc.y - uNode.loc.y)/n_subedges;
      
      let prevNodeID = u;
      
      for (let i = 1; i< n_subedges; i++){
        const subNodeID = `SUBNODE.${edgeID}.${i}`;
        const subEdgeID = `SUBEDGE.${edgeID}.${i}`;

        const newNode: GraphNode = {
          nodeID: subNodeID,
          type: uNode.type,
          loc: {
            x: uNode.loc.x + i * dx,
            y: uNode.loc.y + i * dy,
          }
        };

        const newEdge: GraphEdge = {
          edgeID: subEdgeID,
          u: prevNodeID,
          v: subNodeID,
          len: quantizeLen,
          parentEdge: edgeID
        };

        newGraph.addNode(newNode);
        newGraph.addEdge(newEdge);

        prevNodeID = subNodeID;
      }

      // Final edge
      newGraph.addEdge({
        edgeID: `SUBEDGE.${edgeID}.${n_subedges}`,
        u: prevNodeID,
        v: v,
        len: quantizeLen,
        parentEdge: e.edgeID
      });
    }

    return newGraph;
  }

  public toJSON(): GraphData{
    return {
      nodes: this.nodes,
      edges: this.edges
    };
  }
}

interface RouteStop{
  stnID: string;
  dwell: number; // (seconds)
}

interface Route{
  routeID: string;
  stops: RouteStop[];
  vehID: string;
}

interface VehicleClass{
  name: string;
  a_acc: number; // acceleration rate (m/s/s)
  a_dcc: number; // deceleration rate (m/s/s)
  v_max: number; // maximum speed (m/s)
}

interface Vehicle{
  vehID: string;
  vehClass: VehicleClass;
  routeID: string;
  state?: VehicleSimulationState;
}

interface VehicleSimulationState{
  currentVelocity: number;
  position: string; // current node or edge
}

class TransportMicroSimulator{
  graph: Graph;
  routes: Route[];
  vehicles: Vehicle[];

  constructor(graph: Graph, routes: Route[], vehicles: Vehicle[]){
    this.graph = graph;
    this.routes = routes;
    this.vehicles = vehicles;
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

const loopGraph = createBasicLoopGraph();

const veh: Vehicle = {
  "vehID": "VEH.001",
  "routeID": "RTE.001",
  "vehClass":{
    "a_acc": 1,
    "a_dcc": 1,
    "v_max": 80,
    "name": "bus"
  }
}

const route: Route = {
  "stops": [
    {
      "stnID": "STN.001",
      "dwell": 60
    },{
      "stnID": "STN.003",
      "dwell": 60
    },{
      "stnID": "STN.010",
      "dwell": 60
    },{
      "stnID": "STN.015",
      "dwell": 60
    },{
      "stnID": "STN.018",
      "dwell": 60
    },
  ],
  "vehID":"VEH.001",
  "routeID":"RTE.001"
}

const graph = new Graph();
graph.addGraphData(loopGraph);

const subdivGraph = graph.subdivideGraph(100);

saveGraphToFile(subdivGraph, `sim-outputs/graph-${Date.now()}`)


//const { route, len } = graph.shortestPath('E', 'A'); // Find shortest path from node "A"
//console.log(route); // Shortest distances from node A
//console.log(len); // Previous nodes to reconstruct paths
