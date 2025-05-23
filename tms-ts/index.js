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
            if (!this.checkNodeExistance(newEdge.u)) {
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
    dijkstra(startNodeId) {
        const distances = {};
        const previous = {};
        const visited = new Set();
        // Initialise all distances to inifinty, exect start node
        for (const n of this.nodes) {
            distances[n.id] = Infinity;
            previous[n.id] = null;
        }
        distances[startNodeId] = 0;
        while (visited.size < this.nodes.length) {
            //find the unvisited node with the smallest distance
            let currentNodeId = null;
            let minDistance = Infinity;
            for (const n of this.nodes) {
                if (!visited.has(n.id) && distances[n.id] < minDistance) {
                    minDistance = distances[n.id];
                    currentNodeId = n.id;
                }
            }
            if (currentNodeId === null)
                break;
            visited.add(currentNodeId);
            // outgoing edges from current node
            for (const e of this.edges) {
                if (e.u === currentNodeId) {
                    const vId = e.v;
                    if (!visited.has(vId)) {
                        const newDist = distances[currentNodeId] + e.len;
                        if (newDist < distances[vId]) {
                            distances[vId] = newDist;
                            previous[vId] = currentNodeId;
                        }
                    }
                }
            }
        }
        return { distances, previous };
    }
    shortestPath(uNodeId, vNodeId) {
        const { distances, previous } = this.dijkstra(uNodeId);
        const route = [];
        let len = Infinity;
        if (distances[vNodeId] === Infinity) {
            console.log(`No path exists from ${uNodeId} to ${vNodeId}.`);
            return { route: route, len: len };
        }
        else {
            let currentNodeId = vNodeId;
            len = distances[vNodeId];
            while (currentNodeId) {
                route.unshift(currentNodeId);
                currentNodeId = previous[currentNodeId];
            }
        }
        return { route, len };
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
const filePath = path_1.default.join(__dirname, 'random.json');
const graph = loadGraphData(filePath);
// Now the graph object is populated with nodes and edges from data.json
console.log(graph);
const { route, len } = graph.shortestPath('E', 'A'); // Find shortest path from node "A"
console.log(route); // Shortest distances from node A
console.log(len); // Previous nodes to reconstruct paths
