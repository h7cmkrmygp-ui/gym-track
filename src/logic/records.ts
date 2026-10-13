export type LoggedSet = { exerciseId: number; workoutId: number; at: number; weightKg: number; reps: number };
export type Best = { value: number; at: number };
export type ExerciseRecord = { maxWeight: Best; bestE1rm: Best };

/** Estimated one-rep max (Epley). */
export function e1rm(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

const isWorkingSet = (s: LoggedSet) => s.reps > 0 && s.weightKg > 0;

export function computeRecords(sets: LoggedSet[]): Map<number, ExerciseRecord> {
  const records = new Map<number, ExerciseRecord>();
  for (const s of sets) {
    if (!isWorkingSet(s)) continue;
    const est = e1rm(s.weightKg, s.reps);
    const r = records.get(s.exerciseId);
    if (!r) {
      records.set(s.exerciseId, { maxWeight: { value: s.weightKg, at: s.at }, bestE1rm: { value: est, at: s.at } });
      continue;
    }
    if (s.weightKg > r.maxWeight.value) r.maxWeight = { value: s.weightKg, at: s.at };
    if (est > r.bestE1rm.value) r.bestE1rm = { value: est, at: s.at };
  }
  return records;
}

/** Whether a set beats the previous records. No badge the first time an exercise is done. */
export function prFlags(set: LoggedSet, previous: ExerciseRecord | undefined): { weight: boolean; e1rm: boolean } {
  if (!previous || !isWorkingSet(set)) return { weight: false, e1rm: false };
  return {
    weight: set.weightKg > previous.maxWeight.value,
    e1rm: e1rm(set.weightKg, set.reps) > previous.bestE1rm.value,
  };
}

export type ProgressPoint = { workoutId: number; at: number; maxWeight: number; bestE1rm: number };

/** One point per workout for a single exercise, oldest first. */
export function progressSeries(sets: LoggedSet[]): ProgressPoint[] {
  const byWorkout = new Map<number, ProgressPoint>();
  for (const s of sets) {
    if (!isWorkingSet(s)) continue;
    const est = e1rm(s.weightKg, s.reps);
    const p = byWorkout.get(s.workoutId);
    if (!p) {
      byWorkout.set(s.workoutId, { workoutId: s.workoutId, at: s.at, maxWeight: s.weightKg, bestE1rm: est });
      continue;
    }
    p.at = Math.min(p.at, s.at);
    p.maxWeight = Math.max(p.maxWeight, s.weightKg);
    p.bestE1rm = Math.max(p.bestE1rm, est);
  }
  return [...byWorkout.values()].sort((a, b) => a.at - b.at);
}
