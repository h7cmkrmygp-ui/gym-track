const WEEK = 7 * 86_400_000;

/**
 * Completed sets per muscle group in the week starting at `weekStart`, most trained first.
 * Every group in `groups` appears, at 0 if untrained, so gaps stand out.
 */
export function setsPerMuscle(
  sets: { muscleGroup: string; at: number }[],
  groups: readonly string[],
  weekStart: number,
): { group: string; sets: number }[] {
  const counts = new Map<string, number>(groups.map((g) => [g, 0]));
  for (const s of sets) {
    if (s.at < weekStart || s.at >= weekStart + WEEK) continue;
    counts.set(s.muscleGroup, (counts.get(s.muscleGroup) ?? 0) + 1);
  }
  return [...counts.entries()].map(([group, n]) => ({ group, sets: n })).sort((a, b) => b.sets - a.sets);
}
