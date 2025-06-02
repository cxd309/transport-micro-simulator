"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
class Graph {
    constructor(graphData = { "edges": [], "nodes": [] }) {
        this.edges = [];
        this.nodes = [];
        this.edgeMap = new Map();
        this.shortestPathCache = new Map();
        if (graphData.edges.length > 0 || graphData.nodes.length > 0) {
            this.addGraphData(graphData);
        }
    }
    getEdgeKey(u, v) {
        return `${u}->${v}`;
    }
    getPathKey(start, end) {
        return `${start}->${end}`;
    }
    checkNodeExistance(nodeId) {
        return this.nodes.some(existingNode => existingNode.nodeID === nodeId);
    }
    checkEdgeExistance(edgeId) {
        return this.edges.some(existingEdge => existingEdge.edgeID === edgeId);
    }
    addNode(newNode) {
        const uniqueNode = !this.checkNodeExistance(newNode.nodeID);
        if (uniqueNode) {
            this.nodes.push(newNode);
            console.log(`Node with id ${newNode.nodeID} added.`);
        }
        else {
            console.log(`Node with id ${newNode.nodeID} already exists.`);
        }
        return uniqueNode;
    }
    addEdge(newEdge) {
        const validNodes = this.checkNodeExistance(newEdge.u) && this.checkNodeExistance(newEdge.v);
        const uniqueEdge = !this.checkEdgeExistance(newEdge.edgeID);
        this.clearPathCache();
        if (uniqueEdge && validNodes) {
            this.edges.push(newEdge);
            this.edgeMap.set(this.getEdgeKey(newEdge.u, newEdge.v), newEdge);
            console.log(`Edge with id ${newEdge.edgeID} added.`);
        }
        else if (!uniqueEdge) {
            console.log(`Edge with id ${newEdge.edgeID} already exists.`);
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
    getEdge(u, v) {
        return this.edgeMap.get(this.getEdgeKey(u, v));
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
        console.log("adding graph data");
        this.addNodeList(graphData.nodes);
        this.addEdgeList(graphData.edges);
        console.log("graph data added");
        this.precomputeAllShortestPaths();
    }
    dijkstra(startNodeId) {
        const distances = {};
        const previous = {};
        const visited = new Set();
        // Initialise all distances to inifinty, exect start node
        for (const n of this.nodes) {
            distances[n.nodeID] = Infinity;
            previous[n.nodeID] = null;
        }
        distances[startNodeId] = 0;
        while (visited.size < this.nodes.length) {
            //find the unvisited node with the smallest distance
            let currentNodeId = null;
            let minDistance = Infinity;
            for (const n of this.nodes) {
                if (!visited.has(n.nodeID) && distances[n.nodeID] < minDistance) {
                    minDistance = distances[n.nodeID];
                    currentNodeId = n.nodeID;
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
    shortestPath(start, end) {
        const key = this.getPathKey(start, end);
        const cached = this.shortestPathCache.get(key);
        if (cached)
            return cached;
        console.log("not a cached path");
        const { distances, previous } = this.dijkstra(start);
        const route = [];
        let current = end;
        while (current !== null && current !== start) {
            route.unshift(current);
            current = previous[current];
        }
        if (current === start) {
            route.unshift(start);
            const result = { route, len: distances[end] };
            this.shortestPathCache.set(key, result);
            return result;
        }
        return { route: [], len: Infinity };
    }
    toJSON() {
        return {
            nodes: this.nodes,
            edges: this.edges
        };
    }
    clearPathCache() {
        this.shortestPathCache.clear();
    }
    precomputeAllShortestPaths() {
        console.log("Precomputing all shortest paths...");
        for (const startNode of this.nodes) {
            const { distances, previous } = this.dijkstra(startNode.nodeID);
            for (const endNode of this.nodes) {
                const startId = startNode.nodeID;
                const endId = endNode.nodeID;
                if (startId === endId)
                    continue;
                const key = this.getPathKey(startId, endId);
                if (this.shortestPathCache.has(key))
                    continue;
                const route = [];
                let current = endId;
                while (current !== null && current !== startId) {
                    route.unshift(current);
                    current = previous[current];
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
class SimulationService {
    constructor(service) {
        this.service = service;
        this.position = service.startNodeID;
        if (service.startNodeID === service.stops[0].nodeID) {
            this.nextStop = service.stops[1].nodeID;
        }
        else {
            this.nextStop = service.stops[0].nodeID;
        }
        this.velocity = 0;
        this.state = "stationary";
        this.s_acc = (this.service.vehicle.v_max ** 2) / (2 * this.service.vehicle.a_acc);
        this.s_dcc = (this.service.vehicle.v_max ** 2) / (2 * this.service.vehicle.a_dcc);
        this.remainingDwell = 0;
        this.distanceAlongEdge = 0;
        this.currentEdge = undefined;
    }
    advanceDwell(timeStep) {
        this.remainingDwell -= timeStep;
        if (this.remainingDwell <= 0) {
            this.remainingDwell = 0;
            this.velocity = this.service.vehicle.v_max;
            this.state = "cruising";
        }
    }
    startDwell() {
        var _a;
        this.position = this.nextStop;
        this.velocity = 0;
        this.state = "stationary";
        this.currentEdge = undefined;
        this.distanceAlongEdge = 0;
        const stopIndex = (_a = this.service.stops.findIndex(stop => stop.nodeID === this.position)) !== null && _a !== void 0 ? _a : 0;
        // set the dwell time
        this.remainingDwell = this.service.stops[stopIndex].t_dwell;
        // find the new nextStop
        this.nextStop = this.service.stops[(stopIndex + 1) % this.service.stops.length].nodeID;
    }
}
class TransportMicroSimulator {
    constructor(graphData, services) {
        console.log("building simulator basis");
        this.graph = new Graph(graphData);
        this.simServices = [];
        this.log = [];
        for (const s of services) {
            const simService = new SimulationService(s);
            this.simServices.push(simService);
        }
    }
    run(timeStep, duration) {
        console.log("running simulation");
        for (let i = 0; i < (duration / timeStep); i++) {
            console.log(`timeStep: ${(i * timeStep).toFixed(1)}s`);
            this.step(timeStep);
            this.logState(i * timeStep);
        }
    }
    logState(timestamp) {
        this.log.push({
            "time": timestamp,
            "services": this.simServices
        });
    }
    step(timeStep) {
        const newSimServices = [];
        for (const simService of this.simServices) {
            const vehicle = simService.service.vehicle;
            const speed = vehicle.v_max;
            const distToTravel = speed * timeStep;
            let remainingDist = distToTravel;
            console.log(`${vehicle.name} [${simService.service.serviceID}] at node ${simService.position} ` +
                (simService.currentEdge
                    ? `on edge ${simService.currentEdge.edgeID}, ${simService.distanceAlongEdge.toFixed(2)}m`
                    : `stationary at stop with ${simService.remainingDwell.toFixed(1)} remaining dwell`));
            // Case 1: stationary
            if (simService.remainingDwell > 0) {
                simService.advanceDwell(timeStep); // if timestep is greater than remaining dwell then nothing extra will happen
                continue;
            }
            // Case 2: cruising
            while (remainingDist > 0) {
                if (!simService.currentEdge) {
                    console.log("searching shortest path");
                    const { route } = this.graph.shortestPath(simService.position, simService.nextStop);
                    if (route.length < 2) {
                        simService.startDwell;
                        break;
                    }
                    const nextEdge = this.graph.getEdge(route[0], route[1]);
                    if (!nextEdge) {
                        console.warn("Missing edge:", route[0], "->", route[1]);
                        break;
                    }
                    simService.currentEdge = nextEdge;
                    simService.distanceAlongEdge = 0;
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
                }
                else {
                    // Still moving on current edge
                    simService.distanceAlongEdge += remainingDist;
                    remainingDist = 0;
                }
            }
            simService.velocity = speed;
            simService.state = "cruising";
        }
    }
}
function zeroPad(num, size = 3) {
    return num.toString().padStart(size, '0');
}
function createBasicLoopGraph(n_stn, s_is, s_stn) {
    const gData = { "nodes": [], "edges": [] };
    for (let i = 0; i < n_stn; i++) {
        const stnID = `STN.${zeroPad(i + 1)}`;
        const trkID = `TRK.${zeroPad(i + 1)}`;
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
            len: s_stn / 2,
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
function saveGraphToFile(graph, filePath) {
    const graphData = graph.toJSON();
    const jsonString = JSON.stringify(graphData, null, 2); // pretty-print with 2 spaces
    fs_1.default.writeFileSync(filePath, jsonString, 'utf8');
    console.log(`Graph saved to ${filePath}`);
}
function saveGraphToDrawIO(graph, filePath) {
    //example from draw.io
    //;Example:
    //a->b
    //b->edge label->c
    //c->a
    const outputList = [";graph:"];
    for (const e of graph.edges) {
        outputList.push(`${e.u}->${e.edgeID}(${e.len}m)->${e.v}`);
    }
    const outputString = outputList.join("\n");
    fs_1.default.writeFileSync(filePath, outputList.join("\n"), 'utf-8');
    console.log(`Graph saved to ${filePath}`);
}
function saveSimLogToFile(log, filePath) {
    const jsonString = JSON.stringify(log, null, 2); // pretty-print with 2 spaces
    fs_1.default.writeFileSync(filePath, jsonString, 'utf8');
    console.log(`Graph saved to ${filePath}`);
}
const loopGraph = createBasicLoopGraph(20, 2000, 50);
const veh = {
    "a_acc": 1,
    "a_dcc": 1,
    "v_max": 80,
    "name": "bus"
};
const r = {
    "stops": [
        {
            "nodeID": "STN.001",
            "t_dwell": 60
        }, {
            "nodeID": "STN.005",
            "t_dwell": 60
        }, {
            "nodeID": "STN.010",
            "t_dwell": 60
        }, {
            "nodeID": "STN.015",
            "t_dwell": 60
        }
    ],
    "serviceID": "SVC.001",
    "startNodeID": "STN.001",
    "vehicle": veh
};
const sim = new TransportMicroSimulator(loopGraph, [r]);
saveGraphToDrawIO(sim.graph, `sim-outputs/graph-${Date.now()}`);
sim.run(0.1, 2000);
saveSimLogToFile(sim.log, `sim-outputs/simlog-${Date.now()}`);
//const { route, len } = graph.shortestPath('E', 'A'); // Find shortest path from node "A"
//console.log(route); // Shortest distances from node A
//console.log(len); // Previous nodes to reconstruct paths
