export type SetPlan = { weightKg: number; reps: number };

/**
 * Prefill for the next workout of an exercise: last time's numbers, plus one weight step
 * (reps back to the target) when every set reached the target reps. Bodyweight sets
 * (0 kg) and a step of 0 never progress.
 */
export function planSets(previous: SetPlan[], targetSets: number, targetReps: number, stepKg: number): SetPlan[] {
  if (previous.length === 0) {
    return Array.from({ length: targetSets }, () => ({ weightKg: 0, reps: targetReps }));
  }
  const progress = stepKg > 0 && previous.every((p) => p.reps >= targetReps);
  return Array.from({ length: targetSets }, (_, i) => {
    const base = previous[i] ?? previous[previous.length - 1];
    if (progress && base.weightKg > 0) return { weightKg: base.weightKg + stepKg, reps: targetReps };
    return { weightKg: base.weightKg, reps: base.reps };
  });
}
