import { computeRecords, prFlags, type LoggedSet } from './records';
import { weeklyStreak, weekStart } from './stats';

export type WeekSummary = { sessions: number; sets: number; records: number; streak: number };

export type SummaryInput = {
  workouts: { startedAt: number; setCount: number }[];
  /** Completed sets, all time. */
  sets: LoggedSet[];
  days: Set<string>;
  goal: number;
};

/** Next occurrence of `weekday` (0 = Sunday) at `hour`:00, today included if still ahead. */
export function nextWeeklyAt(now: number, weekday: number, hour: number): number {
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
  if (d.getTime() <= now) d.setDate(d.getDate() + 7);
  return d.getTime();
}

/** What happened in the week (Monday to Sunday) containing `at`. */
export function weekSummary(input: SummaryInput, at: number): WeekSummary {
  const from = weekStart(at).getTime();
  const to = from + 7 * 86_400_000;
  const inWeek = (ts: number) => ts >= from && ts < to;

  const workouts = input.workouts.filter((w) => inWeek(w.startedAt));
  const before = computeRecords(input.sets.filter((s) => s.at < from));
  const recordExercises = new Set(
    input.sets
      .filter((s) => inWeek(s.at))
      .filter((s) => {
        const flags = prFlags(s, before.get(s.exerciseId));
        return flags.weight || flags.e1rm;
      })
      .map((s) => s.exerciseId),
  );

  return {
    sessions: workouts.length,
    sets: workouts.reduce((n, w) => n + w.setCount, 0),
    records: recordExercises.size,
    streak: weeklyStreak(input.days, input.goal, at),
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export function summaryText(s: WeekSummary): string {
  if (s.sessions === 0) return 'Pas de séance cette semaine. On s’y remet lundi ? 💪';
  return [
    plural(s.sessions, 'séance'),
    plural(s.sets, 'série'),
    s.records > 0 && `🏆 ${plural(s.records, 'record')}`,
    s.streak > 0 && `🔥 ${plural(s.streak, 'semaine')} de suite`,
  ]
    .filter(Boolean)
    .join(' · ');
}
