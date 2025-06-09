import { GraphData } from "../graph/models";
import { Graph } from "../graph/Graph";
import fs from "fs";
import {
  MAMap,
  MARecord,
  RouteStop,
  SegmentSection,
} from "../simulation/models";

function zeroPad(num: number, size = 3): string {
  return num.toString().padStart(size, "0");
}

export function createBasicLoopGraph(
  n_stn: number,
  s_is: number,
  s_stn: number
): GraphData {
  const gData: GraphData = { nodes: [], edges: [] };

  for (let i = 0; i < n_stn; i++) {
    const stnID = `STN.${zeroPad(i + 1)}`;
    const trkID = `TRK.${zeroPad(i + 1)}`;

    // Add station node
    gData.nodes.push({
      nodeID: stnID,
      loc: {
        x: Math.cos((2 * Math.PI * i) / n_stn),
        y: Math.sin((2 * Math.PI * i) / n_stn),
      },
      type: "station",
    });

    // Add track node
    gData.nodes.push({
      nodeID: trkID,
      loc: {
        x: Math.cos((2 * Math.PI * (i + 0.5)) / n_stn),
        y: Math.sin((2 * Math.PI * (i + 0.5)) / n_stn),
      },
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
    const nextStationId = `STN.${zeroPad(((i + 1) % n_stn) + 1)}`;
    gData.edges.push({
      edgeID: `E${zeroPad(gData.edges.length + 1)}`,
      u: trkID,
      v: nextStationId,
      len: s_is,
    });
  }

  return gData;
}

export function saveGraphToFile(graph: Graph, filePath: string): void {
  const graphData = graph.toJSON();
  const jsonString = JSON.stringify(graphData, null, 2); // pretty-print with 2 spaces
  fs.writeFileSync(filePath, jsonString, "utf8");
  console.log(`Graph saved to ${filePath}`);
}

export function saveGraphToDrawIO(graph: Graph, filePath: string): void {
  //example from draw.io
  //;Example:
  //a->b
  //b->edge label->c
  //c->a

  const outputList: string[] = [";graph:"];

  for (const e of graph.edges) {
    outputList.push(`${e.u}->${e.edgeID}(${e.len}m)->${e.v}`);
  }

  const outputString = outputList.join("\n");

  fs.writeFileSync(filePath, outputList.join("\n"), "utf-8");
  console.log(`Graph saved to ${filePath}`);
}

export function findStopIndex(nodeID: string, stops: RouteStop[]): number {
  return stops.findIndex((stop) => stop.nodeID === nodeID) ?? 0;
}

export function findNextStop(
  currentNodeID: string,
  stops: RouteStop[]
): RouteStop {
  const curStopIndex = findStopIndex(currentNodeID, stops);
  const nextStopIndex = (curStopIndex + 1) % stops.length;
  return stops[nextStopIndex];
}

export function getSegmentConflict(
  a: SegmentSection,
  b: SegmentSection
): boolean {
  return a.edge.edgeID === b.edge.edgeID && a.start < b.end && b.start < a.end;
}

export function hasConflict(
  proposed: SegmentSection[],
  existing: MAMap,
  selfID: string
): boolean {
  for (const [otherID, record] of existing.entries()) {
    if (otherID === selfID) continue;
    for (const segA of proposed) {
      for (const segB of record.segments) {
        if (getSegmentConflict(segA, segB)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function truncateMA(
  proposed: SegmentSection[],
  existing: MAMap,
  selfID: string
): SegmentSection[] {
  let earliestConflictDistance = Infinity;

  let currentDistance = 0;

  const segmentLength = (seg: SegmentSection) => seg.end - seg.start;

  for (let i = 0; i < proposed.length; i++) {
    const segA = proposed[i];

    for (const [otherID, record] of existing.entries()) {
      if (otherID === selfID) continue;

      for (const segB of record.segments) {
        if (getSegmentConflict(segA, segB)) {
          const conflictStartOnSegment = Math.max(segA.start, segB.start);
          const conflictDistanceFromStart =
            currentDistance + (conflictStartOnSegment - segA.start);
          if (conflictDistanceFromStart < earliestConflictDistance) {
            earliestConflictDistance = conflictDistanceFromStart;
          }
        }
      }
    }

    currentDistance += segmentLength(segA);
  }

  if (earliestConflictDistance === Infinity) {
    return proposed;
  }

  const truncated: SegmentSection[] = [];
  let distAccum = 0;

  for (const seg of proposed) {
    const segLen = segmentLength(seg);

    if (distAccum + segLen < earliestConflictDistance) {
      truncated.push({ ...seg });
      distAccum += segLen;
    } else {
      const allowedEnd = seg.start + (earliestConflictDistance - distAccum);

      truncated.push({
        edge: seg.edge,
        start: seg.start,
        end: allowedEnd,
      });
      break;
    }
  }
  return truncated;
}
