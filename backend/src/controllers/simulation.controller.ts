import type { RequestHandler } from 'express';
import type { AppDependencies, SimulationRequest } from '../types/index.js';
import { evaluateSimulation } from '../services/simulation.service.js';
export function simulationController(dependencies: AppDependencies): RequestHandler {
  return (req, res) => res.json(evaluateSimulation(req.body as SimulationRequest, (dependencies.now ?? (() => new Date()))()));
}
