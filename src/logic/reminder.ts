const DAY = 86_400_000;

const parseDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Calendar days between a YYYY-MM-DD day and `at`. */
export function daysSince(lastDay: string, at: number): number {
  const today = new Date(at);
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - parseDay(lastDay).getTime()) / DAY);
}

/**
 * When to nudge after `days` days without the gym: that evening at `hour`, or the
 * next `hour` if already overdue. Null when off or before the first gym day.
 */
export function inactivityReminderAt(lastDay: string | null, now: number, days: number, hour: number): number | null {
  if (!lastDay || days <= 0) return null;
  const target = parseDay(lastDay);
  target.setDate(target.getDate() + days);
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() > now) return target.getTime();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next.getTime() <= now) next.setDate(next.getDate() + 1);
  return next.getTime();
}
