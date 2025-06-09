import { RouteStop, SegmentSection } from "../simulation/models";
import { findNextStop } from "../utils/helpers";
import { GraphNode, GraphEdge, GraphData, GraphPosition } from "./models";

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
    this.setShortestPathCache();
  }

  private floydWarshall(): {
    distances: Record<string, Record<string, number>>;
    next: Record<string, Record<string, string | null>>;
  } {
    const nodeIDList = this.nodes.map((n) => n.nodeID);
    const distances: Record<string, Record<string, number>> = {};
    const next: Record<string, Record<string, string | null>> = {};

    // initialise distances and next
    for (const i of nodeIDList) {
      distances[i] = {};
      next[i] = {};
      for (const j of nodeIDList) {
        distances[i][j] = i === j ? 0 : Infinity;
        next[i][j] = null;
      }
    }

    // set the edge weights
    for (const e of this.edges) {
      distances[e.u][e.v] = e.len;
      next[e.u][e.v] = e.v;
    }

    // Floyd-Warshall
    for (const k of nodeIDList) {
      for (const i of nodeIDList) {
        for (const j of nodeIDList) {
          if (distances[i][k] + distances[k][j] < distances[i][j]) {
            distances[i][j] = distances[i][k] + distances[k][j];
            next[i][j] = next[i][k];
          }
        }
      }
    }

    return { distances, next };
  }

  private reconstructPath(
    u: string,
    v: string,
    next: Record<string, Record<string, string | null>>
  ): string[] {
    if (next[u][v] === null) return [];
    const path = [];
    while (u !== v) {
      u = next[u][v]!;
      path.push(u);
    }
    return path;
  }

  private setShortestPathCache(): void {
    // use the Floyd-Warshall algorithm
    const nodeIDList = this.nodes.map((n) => n.nodeID);
    const { distances, next } = this.floydWarshall();
    this.shortestPathCache = new Map();
    for (const i of nodeIDList) {
      for (const j of nodeIDList) {
        if (i !== j && distances[i][j] !== Infinity) {
          const path = this.reconstructPath(i, j, next);
          this.shortestPathCache.set(this.getPathKey(i, j), {
            route: path,
            len: distances[i][j],
          });
        }
      }
    }
  }

  public getShortestPath(
    start: string,
    end: string
  ): { route: string[]; len: number } {
    const key = this.getPathKey(start, end);
    const cached = this.shortestPathCache.get(key);
    if (cached) {
      return cached;
    } else {
      console.warn(
        key,
        "is not a cached path, this means it is probably not a valid path or shortestPathCache need to be rebuilt"
      );
      return { route: [], len: Infinity };
    }
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

  public getNextEdge(u: string, v: string): GraphEdge | undefined {
    const { route } = this.getShortestPath(u, v);

    if (route.length < 2) {
      console.warn("getNextEdge: u is equal to v, no edge to find");
      return;
    }
    return this.getEdge(route[0], route[1]);
  }

  public getDistanceToNode(currentPosition: GraphPosition, targetNode: string) {
    const { len } = this.getShortestPath(currentPosition.edge.u, targetNode);

    return len - currentPosition.distanceAlongEdge;
  }

  public getForwardPosition(
    currentPosition: GraphPosition,
    stops: RouteStop[],
    nextStop: string,
    s_total: number
  ): GraphPosition {
    const segments = this.getSegmentsAlongPath(
      currentPosition,
      stops,
      nextStop,
      s_total
    );

    if (segments.length === 0) {
      return currentPosition;
    }
    const lastSegment = segments[-1];
    return {
      edge: lastSegment.edge,
      distanceAlongEdge: lastSegment.end,
    };
  }

  public getSegmentsAlongPath(
    currentPosition: GraphPosition,
    stops: RouteStop[],
    nextStop: string,
    s_total: number
  ): SegmentSection[] {
    const segments: SegmentSection[] = [];
    let s_remaining = s_total;
    while (s_remaining > 0) {
      const edgeDistanceRemaining =
        currentPosition.edge.len - currentPosition.distanceAlongEdge;

      const segmentLength = Math.min(s_remaining, edgeDistanceRemaining);
      const segmentStart = currentPosition.distanceAlongEdge;
      const segmentEnd = segmentStart + segmentLength;

      segments.push({
        edge: currentPosition.edge,
        start: segmentStart,
        end: segmentEnd,
      });

      if (s_remaining > edgeDistanceRemaining) {
        //find the next edge to move onto
        if (currentPosition.edge.v === nextStop) {
          nextStop = findNextStop(currentPosition.edge.v, stops).nodeID;
        }
        const nextEdge = this.getNextEdge(currentPosition.edge.v, nextStop);
        if (!nextEdge) {
          console.warn("Cannot find next edge");
          break;
        } else {
          currentPosition = {
            distanceAlongEdge: 0,
            edge: nextEdge,
          };
          s_remaining -= edgeDistanceRemaining;
        }
      } else {
        currentPosition.distanceAlongEdge += s_remaining;
        s_remaining = 0;
      }
    }
    return segments;
  }
}
