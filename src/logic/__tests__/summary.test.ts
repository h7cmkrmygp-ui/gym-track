import type { LoggedSet } from '../records';
import { nextWeeklyAt, summaryText, weekSummary } from '../summary';

const at = (month: number, day: number, hour = 18) => new Date(2026, month - 1, day, hour).getTime();
// Sunday 18 October 2026, 19:00: the summary of the week starting Monday 12.
const sunday = new Date(2026, 9, 18, 19, 0).getTime();

const set = (p: Partial<LoggedSet>): LoggedSet => ({ exerciseId: 1, workoutId: 1, at: at(10, 5), weightKg: 100, reps: 5, ...p });

describe('nextWeeklyAt', () => {
  test('is the coming Sunday at the given hour', () => {
    expect(new Date(nextWeeklyAt(at(10, 14), 0, 19))).toEqual(new Date(2026, 9, 18, 19, 0, 0, 0));
  });

  test('is next week once this Sunday’s time has passed', () => {
    expect(new Date(nextWeeklyAt(new Date(2026, 9, 18, 20).getTime(), 0, 19))).toEqual(
      new Date(2026, 9, 25, 19, 0, 0, 0),
    );
  });

  test('is today when it is Sunday before the hour', () => {
    expect(new Date(nextWeeklyAt(new Date(2026, 9, 18, 9).getTime(), 0, 19))).toEqual(
      new Date(2026, 9, 18, 19, 0, 0, 0),
    );
  });
});

describe('weekSummary', () => {
  const input = {
    workouts: [
      { startedAt: at(10, 5), setCount: 20 },
      { startedAt: at(10, 12), setCount: 18 },
      { startedAt: at(10, 15), setCount: 16 },
    ],
    sets: [
      set({ exerciseId: 1, at: at(10, 5), weightKg: 100 }),
      set({ exerciseId: 1, at: at(10, 12), weightKg: 105 }),
      set({ exerciseId: 2, at: at(10, 15), weightKg: 60 }),
    ],
    days: new Set(['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-15']),
    goal: 3,
  };

  test('counts this week’s sessions and sets', () => {
    const s = weekSummary(input, sunday);
    expect(s.sessions).toBe(2);
    expect(s.sets).toBe(34);
  });

  test('counts exercises that beat an earlier record, not first-timers', () => {
    expect(weekSummary(input, sunday).records).toBe(1);
  });

  test('includes the weekly streak', () => {
    expect(weekSummary(input, sunday).streak).toBe(1);
  });
});

describe('summaryText', () => {
  test('lists what happened, skipping zeros', () => {
    expect(summaryText({ sessions: 4, sets: 68, records: 2, streak: 3 })).toBe(
      '4 séances · 68 séries · 🏆 2 records · 🔥 3 semaines de suite',
    );
    expect(summaryText({ sessions: 1, sets: 15, records: 0, streak: 0 })).toBe('1 séance · 15 séries');
  });

  test('encourages after an empty week', () => {
    expect(summaryText({ sessions: 0, sets: 0, records: 0, streak: 0 })).toBe(
      'Pas de séance cette semaine. On s’y remet lundi ? 💪',
    );
  });
});
