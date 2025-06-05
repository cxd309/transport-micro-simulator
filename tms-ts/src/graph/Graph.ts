import { GraphNode, GraphEdge, GraphData } from "./models";

export class Graph {
  edges: GraphEdge[];
  nodes: GraphNode[];
  private edgeMap: Map<string, GraphEdge>;
  private shortestPathCache: Map<string, { route: string[]; len: number }>;

  constructor(graphData: GraphData = { edges: [], nodes: [] }) {
    this.edges = [];
    this.nodes = [];
    this.edgeMap = new Map();
    this.shortestPathCache = new Map();

    if (graphData.edges.length > 0 || graphData.nodes.length > 0) {
      this.addGraphData(graphData);
    }
  }

  public getEdge(u: string, v: string): GraphEdge | undefined {
    return this.edgeMap.get(this.getEdgeKey(u, v));
  }

  public getEdgeKey(u: string, v: string): string {
    return `${u}->${v}`;
  }

  public getPathKey(start: string, end: string): string {
    return `${start}->${end}`;
  }

  private checkNodeExistance(nodeId: string): boolean {
    return this.nodes.some((existingNode) => existingNode.nodeID === nodeId);
  }

  private checkEdgeExistance(edgeId: string): boolean {
    return this.edges.some((existingEdge) => existingEdge.edgeID === edgeId);
  }

  private addNode(newNode: GraphNode): boolean {
    const uniqueNode = !this.checkNodeExistance(newNode.nodeID);

    if (uniqueNode) {
      this.nodes.push(newNode);
    } else {
      console.warn(`Node with id ${newNode.nodeID} already exists.`);
    }
    return uniqueNode;
  }

  private addEdge(newEdge: GraphEdge): boolean {
    const validNodes =
      this.checkNodeExistance(newEdge.u) && this.checkNodeExistance(newEdge.v);
    const uniqueEdge = !this.checkEdgeExistance(newEdge.edgeID);

    if (uniqueEdge && validNodes) {
      this.edges.push(newEdge);
      this.edgeMap.set(this.getEdgeKey(newEdge.u, newEdge.v), newEdge);
    } else if (!uniqueEdge) {
      console.warn(`Edge with id ${newEdge.edgeID} already exists.`);
    } else {
      if (!this.checkNodeExistance(newEdge.u)) {
        console.warn(`Node with id ${newEdge.u} does not exist.`);
      } else {
        console.warn(`Node with id ${newEdge.v} does not exist.`);
      }
    }

    return uniqueEdge && validNodes;
  }

  private addEdgeList(edgeList: GraphEdge[]): void {
    for (let newEdge of edgeList) {
      this.addEdge(newEdge);
    }
  }

  private addNodeList(nodeList: GraphNode[]): void {
    for (let newNode of nodeList) {
      this.addNode(newNode);
    }
  }

  public addGraphData(graphData: GraphData): void {
    console.log("adding graph data");
    this.clearPathCache();
    this.addNodeList(graphData.nodes);
    this.addEdgeList(graphData.edges);
    this.precomputeAllShortestPaths();
  }

  public dijkstra(startNodeId: string): {
    distances: Record<string, number>;
    previous: Record<string, string | null>;
  } {
    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const visited: Set<string> = new Set();

    // Initialise all distances to inifinty, exect start node
    for (const n of this.nodes) {
      distances[n.nodeID] = Infinity;
      previous[n.nodeID] = null;
    }
    distances[startNodeId] = 0;

    while (visited.size < this.nodes.length) {
      //find the unvisited node with the smallest distance
      let currentNodeId: string | null = null;
      let minDistance = Infinity;

      for (const n of this.nodes) {
        if (!visited.has(n.nodeID) && distances[n.nodeID] < minDistance) {
          minDistance = distances[n.nodeID];
          currentNodeId = n.nodeID;
        }
      }

      if (currentNodeId === null) break;

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

  public shortestPath(
    start: string,
    end: string
  ): { route: string[]; len: number } {
    const key = this.getPathKey(start, end);
    const cached = this.shortestPathCache.get(key);
    if (cached) return cached;
    console.log(`${key} is not a cached path`);

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

  public toJSON(): GraphData {
    return {
      nodes: this.nodes,
      edges: this.edges,
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
