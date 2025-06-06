export interface Coordinate {
  x: number;
  y: number;
}

export interface GraphEdge {
  edgeID: string;
  u: string;
  v: string;
  len: number;
  parentEdge?: string;
}

export interface GraphNode {
  loc: Coordinate;
  nodeID: string;
  type: "main" | "station" | "side";
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphPosition {
  edge: GraphEdge;
  distanceAlongEdge: number;
}
