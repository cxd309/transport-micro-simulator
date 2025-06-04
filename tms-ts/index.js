"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
let CUR_TIME = 0;
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
            //console.log(`Node with id ${newNode.nodeID} added.`);
        }
        else {
            console.warn(`Node with id ${newNode.nodeID} already exists.`);
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
            //console.log(`Edge with id ${newEdge.edgeID} added.`);
        }
        else if (!uniqueEdge) {
            console.warn(`Edge with id ${newEdge.edgeID} already exists.`);
        }
        else {
            if (!this.checkNodeExistance(newEdge.u)) {
                console.warn(`Node with id ${newEdge.u} does not exist.`);
            }
            else {
                console.warn(`Node with id ${newEdge.v} does not exist.`);
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
        console.log(`${key} is not a cached path`);
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
    setEdgeFromPosition(g) {
        // use the current position and the route to the next stop to find 
        // the next edge on that path
        const { route } = g.shortestPath(this.position, this.nextStop);
        if (route.length < 2) {
            console.warn("current position is equal to next step, no edge to find");
        }
        else {
            const nextEdge = g.getEdge(route[0], route[1]);
            if (!nextEdge) {
                console.warn(`Cannot find next edge, there is no edge from ${g.getEdgeKey(route[0], route[1])}`);
            }
            else {
                this.currentEdge = nextEdge;
                this.distanceAlongEdge = 0;
            }
        }
    }
    startDwell(remainingTime, g) {
        var _a;
        // set the vehicle to stationary
        this.velocity = 0;
        this.state = "stationary";
        // find the index of the current position
        const curStopIndex = (_a = this.service.stops.findIndex(stop => { var _a; return stop.nodeID === ((_a = this.currentEdge) === null || _a === void 0 ? void 0 : _a.v); })) !== null && _a !== void 0 ? _a : 0;
        const nextStopIndex = (curStopIndex + 1) % this.service.stops.length;
        // set the dwell time
        this.remainingDwell = this.service.stops[curStopIndex].t_dwell - remainingTime;
        // set the next stop
        this.nextStop = this.service.stops[nextStopIndex].nodeID;
        // move to the next edge
        this.moveToNextEdge(g);
    }
    advanceDwell(timeStep) {
        this.remainingDwell -= timeStep;
        if (this.remainingDwell <= 0) {
            this.remainingDwell = 0;
            this.velocity = 0;
            this.state = "accelerating";
        }
    }
    updatePosition(timeStep, graph) {
        if (this.remainingDwell > 0) { // check if remainingdwell - timeStep < 0
            this.advanceDwell(timeStep);
        }
        else {
            this.moveVehicle(timeStep, graph);
        }
    }
    findTimeToTravelDistance(s, a) {
        const v_u = Math.max(0.001, this.velocity); // prevent divide by zero error
        let t = 0;
        const dis = (this.velocity ** 2) + (2 * a * s);
        if (dis < 0) {
            console.warn(`Error in finding time to travel a distance:`, `discriminator is less than 0, the distance cannot be reached`, `v_u: ${v_u}`, `s: ${s}`, `a: ${a}`, `dis: ${dis}`);
            return t;
        }
        t = (-this.velocity + Math.sqrt(dis)) / a;
        if (!(!isFinite(t) && t > 0)) {
            t = s / v_u;
        }
        return t;
    }
    findDistanceTravelledInTime(t) {
        let a;
        switch (this.state) {
            case "accelerating":
                a = this.service.vehicle.a_acc;
                break;
            case "decelerating":
                a = this.service.vehicle.a_dcc;
                break;
            default:
                a = 0;
                break;
        }
        const v_initial = this.velocity;
        // make sure final velocity is not less that 0 or greater than v_max
        const v_final = Math.min(Math.max(v_initial + a * t, 0), this.service.vehicle.v_max);
        const s_travelled = t * ((v_initial + v_final) / 2);
        return { s_travelled, a, v_final };
    }
    getMovementAuthority(g) {
        return g.shortestPath(this.position, this.nextStop)['len'] - this.distanceAlongEdge;
    }
    setState(movementAuthority) {
        const breakingDistance = (this.velocity ** 2) / (2 * this.service.vehicle.a_dcc);
        // if the distance to next stop is within the breaking distance
        if (movementAuthority <= breakingDistance) {
            this.state = "decelerating";
        }
        // if the velocity is less than v_max
        else if (this.velocity < this.service.vehicle.v_max) {
            this.state = "accelerating";
        }
        // the velocity is equal to v_max
        else {
            this.state = "cruising";
        }
    }
    moveToNextEdge(g) {
        var _a, _b;
        this.position = (_b = (_a = this.currentEdge) === null || _a === void 0 ? void 0 : _a.v) !== null && _b !== void 0 ? _b : "";
        this.distanceAlongEdge = 0;
        this.setEdgeFromPosition(g);
        console.log("Time:", CUR_TIME.toFixed(0), ": service", this.service.serviceID, "at node", this.position);
    }
    moveVehicle(timeStep, g) {
        var _a, _b;
        // console.log("Time:", CUR_TIME, ": service", this.service.serviceID, "at edge", this.currentEdge?.edgeID, "distance", this.distanceAlongEdge.toFixed(0), "velocity", this.velocity.toFixed(0));
        // start by making a tracker for the remaining time and then 
        // itterate over, removing chunks of that time
        if (!this.currentEdge) {
            this.setEdgeFromPosition(g);
        }
        let remainingTime = timeStep;
        while (remainingTime > 0) {
            const remainingEdgeLen = (((_a = this.currentEdge) === null || _a === void 0 ? void 0 : _a.len) || 0) - this.distanceAlongEdge;
            const movementAuthority = this.getMovementAuthority(g);
            // determine the state of the service
            this.setState(movementAuthority);
            // find the distance travelled by the vehicle
            let { s_travelled, a, v_final } = this.findDistanceTravelledInTime(remainingTime);
            if (s_travelled >= remainingEdgeLen) {
                // find the time taken to travel to the end of the edge
                const timeToNode = this.findTimeToTravelDistance(remainingEdgeLen, a);
                // remove from remainingTime
                remainingTime = remainingTime - timeToNode;
                // find the speed at the node
                const { v_final: vAtNode } = this.findDistanceTravelledInTime(timeToNode);
                v_final = vAtNode;
                // check if it's reached a station
                if (this.nextStop === ((_b = this.currentEdge) === null || _b === void 0 ? void 0 : _b.v)) {
                    this.startDwell(remainingTime, g);
                    remainingTime = 0; //startDwell will handle the remainingTime
                }
                else {
                    // move to the next edge
                    this.moveToNextEdge(g);
                }
            }
            else {
                // move along the edge
                this.distanceAlongEdge += s_travelled;
                // remove the time remaining
                remainingTime = 0;
            }
            // update the final speed (considering if the time has adjusted)
            this.velocity = v_final;
        }
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
        CUR_TIME = 0;
        for (let i = 0; i < (duration / timeStep); i++) {
            //console.log(`timeStep: ${(i*timeStep).toFixed(1)}s`);
            this.step(timeStep);
            CUR_TIME += timeStep;
            this.logState(CUR_TIME);
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
            simService.updatePosition(timeStep, this.graph);
            newSimServices.push(simService);
        }
        this.simServices = newSimServices;
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
sim.run(0.1, 10000);
saveSimLogToFile(sim.log, `sim-outputs/simlog-${Date.now()}`);
//const { route, len } = graph.shortestPath('E', 'A'); // Find shortest path from node "A"
//console.log(route); // Shortest distances from node A
//console.log(len); // Previous nodes to reconstruct paths
