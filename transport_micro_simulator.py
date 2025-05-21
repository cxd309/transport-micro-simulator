from dataclasses import dataclass
from typing import List

class Vehicle:
  def __init__(self, v_max: float, a_acc: float, a_dcc: float):
    self.v_max = v_max  # maximum line speed (m/s)
    self.a_acc = a_acc  # acceleration (m/s^2)
    self.a_dcc = a_dcc  # deceleration (m/s^2)

    self.s_acc = (self.v_max ** 2) / (2 * self.a_acc)  # distance to accelerate to v_max (m)
    self.s_dcc = (self.v_max ** 2) / (2 * self.a_dcc)  # distance to stop from v_max (m)

    self.t_acc = self.v_max / self.a_acc  # time to accelerate to v_max (s)
    self.t_dcc = self.v_max / self.a_dcc  # time to stop from v_max (s)

class Operations:
  def __init__(self, t_hw: float, t_dw: float):
    self.t_hw = t_hw  # headway (s)
    self.t_dw = t_dw  # dwell time (s)

class Journey:
  def __init__(self, s_j: float, v_walk: float):
    self.s_j = s_j  # journey distance (m)
    self.v_walk = v_walk  # walking speed (m/s)

@dataclass
class SimulationResult:
    n_stn: int          # number of stations
    s_is: float         # interstation distance (m)
    t_vehicle: float    # vehicle time (s)
    t_access: float     # access time (s)
    t_wait: float       # wait time (s)
    t_dtd: float        # door-to-door journey time (s)

@dataclass
class FormValues:
    s_j: float       # journey distance (km)
    tphpd: float     # trains per hour per direction
    v_max: float     # maximum line speed (km/h)
    a_acc: float     # mean acceleration (m/s^2)
    a_dcc: float     # mean deceleration (m/s^2)
    t_dw: float      # dwell time (mins)
    v_walk: float    # average walking pace (km/h)

@dataclass
class SimulationParameters:
    veh: Vehicle      # vehicle parameters
    ops: Operations   # operations parameters
    jny: Journey      # journey parameter

function 