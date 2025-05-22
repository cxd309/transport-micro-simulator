import fs from 'fs';
import path from 'path';

interface Coordinate{
  x: number
  y: number
}

interface GraphNode{
  loc: Coordinate
  id: string
}

interface GraphEdge{
  id: string
  u: string
  v: string
  len: number
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
      if (this.checkNodeExistance(newEdge.u)) {
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
}

// Function to read and load data from data.json
function loadGraphData(filePath: string): Graph {
  const rawData = fs.readFileSync(filePath, 'utf-8'); // Read file synchronously
  const jsonData = JSON.parse(rawData); // Parse the JSON data

  const graph = new Graph();

  // Add nodes and edges to the graph
  graph.addNodeList(jsonData.nodes);
  graph.addEdgeList(jsonData.edges);

  return graph;
}

// Load the graph from data.json
const filePath = path.join(__dirname, 'data.json');
const graph = loadGraphData(filePath);

// Now the graph object is populated with nodes and edges from data.json
console.log(graph);
