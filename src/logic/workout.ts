/** A copy of `list` with the item at `index` swapped with its neighbour; unchanged at the ends. */
export function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  const copy = [...list];
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return copy;
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

/** "42 min", or "1 h 05" from an hour. */
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 60) return `${totalMin} min`;
  return `${Math.floor(totalMin / 60)} h ${String(totalMin % 60).padStart(2, '0')}`;
}

/** The exercise being worked on: the first with a set left, or the last one when all are done. */
export function currentExerciseIndex(exercises: { sets: { completedAt: number | null }[] }[]): number {
  const index = exercises.findIndex((e) => e.sets.some((s) => s.completedAt === null));
  if (index !== -1) return index;
  return Math.max(0, exercises.length - 1);
}
