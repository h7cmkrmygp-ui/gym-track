export type Visit = {
  id: number;
  gymId: number | null;
  startAt: number;
  endAt: number | null;
  source: 'geofence' | 'manual';
};

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Shorter visits are someone driving or walking past the gym. */
export const MIN_VISIT_MS = 10 * MIN;
/** Leaving and coming back within this gap is GPS noise, not a new visit. */
export const MERGE_GAP_MS = 30 * MIN;
/** An open visit older than this missed its exit event. */
export const STALE_OPEN_MS = 6 * HOUR;
/** Assumed length of a visit whose exit event was missed. */
export const STALE_DURATION_MS = 2 * HOUR;

export type EnterPlan =
  | { action: 'none' }
  | { action: 'reopen'; id: number }
  | { action: 'create'; closeStale?: { id: number; endAt: number } };

/** What to do when the phone enters a gym zone, given the last visit to that gym. */
export function planEnter(last: Visit | null, now: number): EnterPlan {
  if (!last) return { action: 'create' };

  if (last.endAt === null) {
    if (now - last.startAt < STALE_OPEN_MS) return { action: 'none' };
    return { action: 'create', closeStale: { id: last.id, endAt: last.startAt + STALE_DURATION_MS } };
  }

  if (now - last.endAt < MERGE_GAP_MS) return { action: 'reopen', id: last.id };
  return { action: 'create' };
}

export function isCountedVisit(v: Visit, now: number): boolean {
  if (v.source === 'manual') return true;
  let end = v.endAt ?? now;
  if (v.endAt === null && now - v.startAt > STALE_OPEN_MS) end = v.startAt + STALE_DURATION_MS;
  return end - v.startAt >= MIN_VISIT_MS;
}
