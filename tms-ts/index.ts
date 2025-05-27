import { create } from 'domain';
import fs from 'fs';
import path from 'path';

interface Coordinate{
  x: number
  y: number
}

interface GraphNode{
  loc: Coordinate
  id: string
  type: "main" | "station" | "side"
}

interface GraphEdge{
  id: string
  u: string
  v: string
  len: number
}

interface GraphData{
  nodes: GraphNode[]
  edges: GraphEdge[]
}

class Graph{
  edges: GraphEdge[];
  nodes: GraphNode[];

  constructor(){
    this.edges = [];
    this.nodes = [];
  }

  private checkNodeExistance(nodeId: string): boolean {
    return this.nodes.some(existingNode=>existingNode.id === nodeId);
  }

  private checkEdgeExistance(edgeId: string): boolean {
    return this.edges.some(existingEdge=>existingEdge.id === edgeId);
  }

  public addNode(newNode: GraphNode): boolean {
    const uniqueNode = !this.checkNodeExistance(newNode.id);

    if(uniqueNode){
      this.nodes.push(newNode);
      console.log(`Node with id ${newNode.id} added.`);
    }else{
      console.log(`Node with id ${newNode.id} already exists.`);
    }
    return uniqueNode;
  }

  public addEdge(newEdge: GraphEdge): boolean {
    const validNodes = this.checkNodeExistance(newEdge.u) && this.checkNodeExistance(newEdge.v);
    const uniqueEdge = !this.checkEdgeExistance(newEdge.id);

    if (uniqueEdge && validNodes) {
      this.edges.push(newEdge);
      console.log(`Edge with id ${newEdge.id} added.`);
    } else if(!uniqueEdge){
      console.log(`Edge with id ${newEdge.id} already exists.`);
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
      distances[n.id] = Infinity;
      previous[n.id] = null;
    }
    distances[startNodeId] = 0;

    while (visited.size < this.nodes.length){
      //find the unvisited node with the smallest distance
      let currentNodeId: string | null = null;
      let minDistance = Infinity;

      for (const n of this.nodes){
        if (!visited.has(n.id) && distances[n.id] < minDistance){
          minDistance = distances[n.id];
          currentNodeId = n.id;
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
}

class Route{
  stops: string[];

  constructor(stops: string[]){
    this.stops = stops;
  }
}

class Vehicle{
  id: string;

  constructor(id: string){
    this.id = id;
  }
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

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (let i=0; i< n_stn; i++){
    const stnID = `STN.${zeroPad(i+1)}`;
    const trkID = `TRK.${zeroPad(i+1)}`;

    // Add station node
    nodes.push({
      id: stnID,
      loc: { x: Math.cos((2 * Math.PI * i) / n_stn), y: Math.sin((2 * Math.PI * i) / n_stn) },
      type: "station",
    });

    // Add track node
    nodes.push({
      id: trkID,
      loc: { x: Math.cos((2 * Math.PI * (i + 0.5)) / n_stn), y: Math.sin((2 * Math.PI * (i + 0.5)) / n_stn) },
      type: "main",
    });

    // Edge from station to track
    edges.push({
      id: `E${zeroPad(edges.length + 1)}`,
      u: stnID,
      v: trkID,
      len: 0,
    });

    // Edge from track to next station
    const nextStationId = `STN.${zeroPad((i + 1) % n_stn + 1)}`;
    edges.push({
      id: `E${zeroPad(edges.length + 1)}`,
      u: trkID,
      v: nextStationId,
      len: s_is,
    });
  }
  
  
  return { nodes, edges };
}

const loopGraph = createBasicLoopGraph();

const graph = new Graph();

// Add nodes and edges to the graph
graph.addGraphData(loopGraph);

// Now the graph object is populated with nodes and edges from data.json
console.log(graph);

//const { route, len } = graph.shortestPath('E', 'A'); // Find shortest path from node "A"
//console.log(route); // Shortest distances from node A
//console.log(len); // Previous nodes to reconstruct paths
