import { isCountedVisit, type Visit } from './visits';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Days at the gym: a counted visit, a manual check-in or a logged workout. */
export function attendanceDays(visits: Visit[], workoutStarts: number[], now: number): Set<string> {
  const days = new Set<string>();
  for (const v of visits) if (isCountedVisit(v, now)) days.add(dayKey(v.startAt));
  for (const start of workoutStarts) days.add(dayKey(start));
  return days;
}

/** Midnight on the Monday of the week containing `ts`. */
export function weekStart(ts: number): Date {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function daysInWeek(days: Set<string>, monday: Date): number {
  let count = 0;
  const d = new Date(monday);
  for (let i = 0; i < 7; i++) {
    if (days.has(dayKey(d.getTime()))) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export function daysThisWeek(days: Set<string>, now: number): number {
  return daysInWeek(days, weekStart(now));
}

/**
 * Consecutive weeks that reached the weekly goal. The current week counts once
 * reached, and does not break the streak while still in progress.
 */
export function weeklyStreak(days: Set<string>, goal: number, now: number): number {
  const monday = weekStart(now);
  let streak = daysInWeek(days, monday) >= goal ? 1 : 0;
  for (;;) {
    monday.setDate(monday.getDate() - 7);
    if (daysInWeek(days, monday) < goal) return streak;
    streak++;
  }
}

/** Sets and minutes trained in the week (Monday to Sunday) containing `now`. */
export function weekTotals(
  workouts: { startedAt: number; endedAt: number | null; setCount: number }[],
  now: number,
): { sets: number; minutes: number } {
  const from = weekStart(now).getTime();
  const to = from + 7 * 86_400_000;
  let sets = 0;
  let minutes = 0;
  for (const w of workouts) {
    if (w.startedAt < from || w.startedAt >= to) continue;
    sets += w.setCount;
    if (w.endedAt !== null) minutes += Math.round((w.endedAt - w.startedAt) / 60_000);
  }
  return { sets, minutes };
}
