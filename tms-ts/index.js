"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
class Graph {
    constructor() {
        this.edges = [];
        this.nodes = [];
        this.edgeMap = new Map();
        this.shortestPathCache = new Map();
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
            //console.log(`Node with id ${newNode.nodeID} added.`);
        }
        else {
            console.log(`Node with id ${newNode.nodeID} already exists.`);
        }
        return uniqueNode;
    }
    addEdge(newEdge) {
        const validNodes = this.checkNodeExistance(newEdge.u) && this.checkNodeExistance(newEdge.v);
        const uniqueEdge = !this.checkEdgeExistance(newEdge.edgeID);
        if (uniqueEdge && validNodes) {
            this.edges.push(newEdge);
            this.edgeMap.set(this.getEdgeKey(newEdge.u, newEdge.v), newEdge);
            //console.log(`Edge with id ${newEdge.edgeID} added.`);
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
            this.shortestPathCache.set(key, result); // 🔒 Cache result
            return result;
        }
        return { route: [], len: Infinity }; // no path found
    }
    subdivideGraph(quantizeLen) {
        const newGraph = new Graph;
        newGraph.addNodeList(this.nodes);
        let subNodeCount = 0;
        let subEdgeCount = 0;
        for (const e of this.edges) {
            const { u, v, len, edgeID } = e;
            if (len <= quantizeLen) {
                newGraph.addEdge({
                    "edgeID": edgeID,
                    "len": quantizeLen,
                    "u": u,
                    "v": v
                });
                continue;
            }
            const uNode = this.nodes.find(n => n.nodeID === u);
            const vNode = this.nodes.find(n => n.nodeID === v);
            if (!uNode || !vNode) {
                console.warn(`Edge ${e.edgeID} refers to non-existent nodes.`);
                continue;
            }
            const n_subedges = Math.ceil(len / quantizeLen);
            const dx = (vNode.loc.x - uNode.loc.x) / n_subedges;
            const dy = (vNode.loc.y - uNode.loc.y) / n_subedges;
            let prevNodeID = u;
            for (let i = 1; i < n_subedges; i++) {
                const subNodeID = `SUBNODE.${edgeID}.${i}`;
                const subEdgeID = `SUBEDGE.${edgeID}.${i}`;
                const newNode = {
                    nodeID: subNodeID,
                    type: uNode.type,
                    loc: {
                        x: uNode.loc.x + i * dx,
                        y: uNode.loc.y + i * dy,
                    }
                };
                const newEdge = {
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
    toJSON() {
        return {
            nodes: this.nodes,
            edges: this.edges
        };
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
        const stopIndex = (_a = this.service.stops.findIndex(stop => stop.nodeID === this.position)) !== null && _a !== void 0 ? _a : 0;
        // set the dwell time
        this.remainingDwell = this.service.stops[stopIndex].t_dwell;
        // find the new nextStop
        this.nextStop = this.service.stops[(stopIndex + 1) % this.service.stops.length].nodeID;
    }
}
class TransportMicroSimulator {
    constructor(graphData, services, quantizeLen, timeStep, duration) {
        const g = new Graph();
        g.addGraphData(graphData);
        this.graph = g.subdivideGraph(quantizeLen);
        this.timeStep = timeStep;
        this.simServices = [];
        this.duration = duration;
        this.log = [];
        for (const s of services) {
            const simService = new SimulationService(s);
            this.simServices.push(simService);
        }
    }
    run() {
        for (let i = 0; i < (this.duration / this.timeStep); i++) {
            this.step();
            this.logState(i * this.timeStep);
        }
    }
    logState(timestamp) {
        this.log.push({
            "time": timestamp,
            "services": this.simServices
        });
    }
    step() {
        const newSimServices = [];
        for (const simService of this.simServices) {
            // Case 1: stationary
            if (simService.remainingDwell > 0) {
                simService.advanceDwell(this.timeStep);
                continue;
            }
            // Case 2: cruising
            const { route: nextStopRoute, len: nextStopLen } = this.graph.shortestPath(simService.position, simService.nextStop);
            const projectedDistance = simService.service.vehicle.v_max * this.timeStep;
            if (nextStopLen <= projectedDistance || nextStopRoute.length === 2) {
                // arrived at station
                simService.startDwell();
            }
            else {
                // move the correct number of nodes
                let distToGo = projectedDistance;
                let currentNode = simService.position;
                for (let i = 1; i < nextStopRoute.length; i++) {
                    const e = this.graph.getEdge(currentNode, nextStopRoute[i]);
                    if (!e)
                        break;
                    if (e.len <= distToGo || i === 1) {
                        currentNode = e.v;
                        distToGo -= e.len;
                    }
                    else {
                        break;
                    }
                }
                simService.position = currentNode;
                simService.velocity = simService.service.vehicle.v_max;
                simService.state = "cruising";
            }
            console.log(`${simService.service.vehicle.name} in state ${simService.state} in position ${simService.position}`);
            newSimServices.push(simService);
        }
        this.simServices = newSimServices;
    }
}
function zeroPad(num, size = 3) {
    return num.toString().padStart(size, '0');
}
function createBasicLoopGraph() {
    const n_stn = 20;
    const s_is = 2000;
    const s_stn = 100;
    const nodes = [];
    const edges = [];
    for (let i = 0; i < n_stn; i++) {
        const stnID = `STN.${zeroPad(i + 1)}`;
        const trkID = `TRK.${zeroPad(i + 1)}`;
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
            len: s_stn / 2,
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
function saveGraphToFile(graph, filePath) {
    const graphData = graph.toJSON();
    const jsonString = JSON.stringify(graphData, null, 2); // pretty-print with 2 spaces
    fs_1.default.writeFileSync(filePath, jsonString, 'utf8');
    console.log(`Graph saved to ${filePath}`);
}
function saveSimLogToFile(log, filePath) {
    const jsonString = JSON.stringify(log, null, 2); // pretty-print with 2 spaces
    fs_1.default.writeFileSync(filePath, jsonString, 'utf8');
    console.log(`Graph saved to ${filePath}`);
}
const loopGraph = createBasicLoopGraph();
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
            "nodeID": "STN.003",
            "t_dwell": 60
        }, {
            "nodeID": "STN.010",
            "t_dwell": 60
        }, {
            "nodeID": "STN.015",
            "t_dwell": 60
        }, {
            "nodeID": "STN.018",
            "t_dwell": 60
        },
    ],
    "serviceID": "SVC.001",
    "startNodeID": "STN.001",
    "vehicle": veh
};
const sim = new TransportMicroSimulator(loopGraph, [r], 1, 2, 200);
sim.run();
saveSimLogToFile(sim.log, `sim-outputs/simlog-${Date.now()}`);
//const { route, len } = graph.shortestPath('E', 'A'); // Find shortest path from node "A"
//console.log(route); // Shortest distances from node A
//console.log(len); // Previous nodes to reconstruct paths
