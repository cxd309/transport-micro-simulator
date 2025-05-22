"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Graph {
    constructor() {
        this.edges = [];
        this.nodes = [];
    }
    checkNodeExistance(nodeId) {
        return this.nodes.some(existingNode => existingNode.id === nodeId);
    }
    checkEdgeExistance(edgeId) {
        return this.edges.some(existingEdge => existingEdge.id === edgeId);
    }
    addNode(newNode) {
        const uniqueNode = !this.checkNodeExistance(newNode.id);
        if (uniqueNode) {
            this.nodes.push(newNode);
            console.log(`Node with id ${newNode.id} added.`);
        }
        else {
            console.log(`Node with id ${newNode.id} already exists.`);
        }
        return uniqueNode;
    }
    addEdge(newEdge) {
        const validNodes = this.checkNodeExistance(newEdge.u) && this.checkNodeExistance(newEdge.v);
        const uniqueEdge = !this.checkEdgeExistance(newEdge.id);
        if (uniqueEdge && validNodes) {
            this.edges.push(newEdge);
            console.log(`Edge with id ${newEdge.id} added.`);
        }
        else if (!uniqueEdge) {
            console.log(`Edge with id ${newEdge.id} already exists.`);
        }
        else {
            if (this.checkNodeExistance(newEdge.u)) {
                console.log(`Node with id ${newEdge.u} does not exist.`);
            }
            else {
                console.log(`Node with id ${newEdge.v} does not exist.`);
            }
        }
        return uniqueEdge && validNodes;
    }
    addEdgeList(edgeList) {
        for (let newEdge of edgeList) {
            this.addEdge(newEdge);
        }
    }
    addNodeList(nodeList) {
        for (let newNode of nodeList) {
            this.addNode(newNode);
        }
    }
}
// Function to read and load data from data.json
function loadGraphData(filePath) {
    const rawData = fs_1.default.readFileSync(filePath, 'utf-8'); // Read file synchronously
    const jsonData = JSON.parse(rawData); // Parse the JSON data
    const graph = new Graph();
    // Add nodes and edges to the graph
    graph.addNodeList(jsonData.nodes);
    graph.addEdgeList(jsonData.edges);
    return graph;
}
// Load the graph from data.json
const filePath = path_1.default.join(__dirname, 'data.json');
const graph = loadGraphData(filePath);
// Now the graph object is populated with nodes and edges from data.json
console.log(graph);
