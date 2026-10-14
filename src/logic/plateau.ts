import type { ProgressPoint } from './records';
import { fromDisplay, toDisplay, weightStep, type Unit } from './units';

/**
 * Stuck: the last `sessions` workouts never beat the estimated max reached before them.
 * Needs at least one earlier session to compare with.
 */
export function isPlateau(series: ProgressPoint[], sessions = 3): boolean {
  if (series.length < sessions + 1) return false;
  const earlier = series.slice(0, -sessions);
  const recent = series.slice(-sessions);
  const earlierBest = Math.max(...earlier.map((p) => p.bestE1rm));
  return Math.max(...recent.map((p) => p.bestE1rm)) <= earlierBest;
}

/** 10 % lighter, rounded down to the plates step (5 lbs or 2.5 kg). Returns kg. */
export function deloadWeight(weightKg: number, unit: Unit): number {
  const step = weightStep(unit);
  const lighter = toDisplay(weightKg, unit) * 0.9;
  return fromDisplay(Math.floor(lighter / step + 1e-9) * step, unit);
}
