from dataclasses import dataclass
from typing import List

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
class SimulationParameters:
    veh: Vehicle      # vehicle parameters
    ops: Operations   # operations parameters
    jny: Journey      # journey parameter

class CoverageParadoxSimulation:
  def __init__(self, jny: Journey, veh: Vehicle, ops: Operations):
    self.jny = jny
    self.veh = veh
    self.ops = ops
    self.sim_results: List[SimulationResult] = []

  def run_simulation(self) -> List[SimulationResult]:
    n_stn_max = ceil((self.jny.s_j / (self.veh.s_acc + self.veh.s_dcc)) + 0.5)
    self.sim_results = []

    for n_stn in range(2, n_stn_max):
      ind_result = self.run_ind_simulation(n_stn)
      self.sim_results.append(ind_result)

    return self.sim_results

  def run_ind_simulation(self, n_stn: int) -> SimulationResult:
    s_is = self.jny.s_j / (n_stn - 0.5)  # interstation distance
    s_vmax = s_is - self.veh.s_acc - self.veh.s_dcc  # distance traveled at max speed
    t_vmax = s_vmax / self.veh.v_max  # time at v_max
    t_is = t_vmax + self.veh.t_acc + self.veh.t_dcc  # interstation time
    t_vehicle = (t_is * (n_stn - 1)) + (self.ops.t_dw * (n_stn - 2))  # total vehicle time
    t_access = (s_is / 4) / self.jny.v_walk  # access time
    t_wait = self.ops.t_hw / 2  # wait time
    t_dtd = t_vehicle + 2 * t_access + t_wait  # door-to-door time

    return SimulationResult(
      n_stn=n_stn,
      s_is=s_is,
      t_vehicle=t_vehicle,
      t_access=t_access,
      t_wait=t_wait,
      t_dtd=t_dtd
    )

  def get_optimum_result(self) -> SimulationResult:
    optimum_result = self.sim_results[0]
    for test_result in self.sim_results:
      if test_result.t_dtd <= optimum_result.t_dtd:
        optimum_result = test_result
    return optimum_result