import { dayKey, daysThisWeek, weeklyStreak, weekStart } from './stats';

export type WidgetInput = {
  days: Set<string>;
  goal: number;
  next: { name: string; exercises: string[] } | null;
  lastWorkout: { name: string; startedAt: number; setCount: number } | null;
};

/** What the home screen widget shows. Plain values only: it is serialized to the widget. */
export type WidgetData = {
  streak: number;
  week: number;
  goal: number;
  /** Monday to Sunday, true on gym days. */
  weekDays: boolean[];
  todayIndex: number;
  next: string | null;
  nextExercises: string[];
  last: string | null;
};

const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d;
};

export function relativeDay(ts: number, at: number): string {
  const days = Math.round((startOfDay(at).getTime() - startOfDay(ts).getTime()) / 86_400_000);
  if (days <= 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  return `il y a ${days} j`;
}

export function widgetData(input: WidgetInput, at: number): WidgetData {
  const monday = weekStart(at);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return input.days.has(dayKey(d.getTime()));
  });
  const last = input.lastWorkout;
  return {
    streak: weeklyStreak(input.days, input.goal, at),
    week: daysThisWeek(input.days, at),
    goal: input.goal,
    weekDays,
    todayIndex: (new Date(at).getDay() + 6) % 7,
    next: input.next?.name ?? null,
    nextExercises: input.next?.exercises ?? [],
    last: last ? `${last.name} · ${relativeDay(last.startedAt, at)} · ${last.setCount} séries` : null,
  };
}

/** An entry for now, then one at each of the next 7 midnights so the week rolls over on its own. */
export function widgetTimeline(input: WidgetInput, now: number): { date: number; props: WidgetData }[] {
  const entries = [{ date: now, props: widgetData(input, now) }];
  const midnight = startOfDay(now);
  for (let i = 0; i < 7; i++) {
    midnight.setDate(midnight.getDate() + 1);
    const date = midnight.getTime();
    entries.push({ date, props: widgetData(input, date) });
  }
  return entries;
}
