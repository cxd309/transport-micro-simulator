import { GraphData } from "../graph/models";
import { Graph } from "../graph/Graph";
import fs from "fs";

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
