"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    addGraphData(graphData) {
        this.addNodeList(graphData.nodes);
        this.addEdgeList(graphData.edges);
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
class Route {
    constructor(stops) {
        this.stops = stops;
    }
}
class Vehicle {
    constructor(id) {
        this.id = id;
    }
}
class TransportMicroSimulator {
    constructor(graph, routes, vehicles) {
        this.graph = graph;
        this.routes = routes;
        this.vehicles = vehicles;
    }
}
function zeroPad(num, size = 3) {
    return num.toString().padStart(size, '0');
}
function createBasicLoopGraph() {
    const n_stn = 20;
    const s_is = 2000;
    const nodes = [];
    const edges = [];
    for (let i = 0; i < n_stn; i++) {
        const stnID = `STN.${zeroPad(i + 1)}`;
        const trkID = `TRK.${zeroPad(i + 1)}`;
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
