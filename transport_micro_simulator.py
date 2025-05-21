from dataclasses import dataclass
import networkx as nx
from typing import List
import json

@dataclass
class Location:
  x: float
  y: float

@dataclass
class Path:
  orig: str # id for origin of path
  dest: str # id for destination of path
  len: float # length of the path

class Infrastructure:
  def __init__(self, pathList: List[Path]):
    self.pathList = pathList

    self.G = self.build_graph()

  def build_graph(self) -> nx.DiGraph:
    G = nx.DiGraph()
    for path in self.pathList:
      G.add_edge(path.orig, path.dest, weight=path.len)
    return G

def load_paths(path_file):
  with open(path_file) as file_content:
    data = json.load(file_content)
    return data["paths"]