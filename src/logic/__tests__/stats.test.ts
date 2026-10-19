import { attendanceDays, dayKey, daysThisWeek, weeklyStreak, weekTotals } from '../stats';
import type { Visit } from '../visits';

const MIN = 60_000;
// Monday 12 October 2026, 18:00 local time.
const now = new Date(2026, 9, 12, 18, 0).getTime();
const at = (month: number, day: number, hour = 18) => new Date(2026, month - 1, day, hour).getTime();

describe('dayKey', () => {
  test('formats the local calendar day', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });
});

describe('attendanceDays', () => {
  test('combines counted visits and workouts, ignoring drive-bys', () => {
    const visits: Visit[] = [
      { id: 1, gymId: 1, startAt: at(10, 8), endAt: at(10, 8) + 60 * MIN, source: 'geofence' },
      { id: 2, gymId: 1, startAt: at(10, 9), endAt: at(10, 9) + 3 * MIN, source: 'geofence' },
      { id: 3, gymId: null, startAt: at(10, 10), endAt: null, source: 'manual' },
    ];
    const days = attendanceDays(visits, [at(10, 11)], now);
    expect([...days].sort()).toEqual(['2026-10-08', '2026-10-10', '2026-10-11']);
  });
});

describe('weekly stats', () => {
  const days = (...keys: string[]) => new Set(keys);

  test('daysThisWeek counts days since Monday', () => {
    const thursday = at(10, 15);
    expect(daysThisWeek(days('2026-10-11', '2026-10-12', '2026-10-14'), thursday)).toBe(2);
  });

  test('streak counts consecutive weeks that reached the goal', () => {
    const d = days(
      // week of 28 Sep: 3 days
      '2026-09-28', '2026-09-30', '2026-10-02',
      // week of 5 Oct: 3 days
      '2026-10-05', '2026-10-07', '2026-10-09',
    );
    expect(weeklyStreak(d, 3, now)).toBe(2);
  });

  test('the current week in progress does not break the streak', () => {
    const d = days('2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12');
    expect(weeklyStreak(d, 3, now)).toBe(1);
  });

  test('the current week counts once the goal is reached', () => {
    const d = days('2026-10-12', '2026-10-13', '2026-10-14', '2026-10-05', '2026-10-06', '2026-10-07');
    expect(weeklyStreak(d, 3, at(10, 15))).toBe(2);
  });

  test('a missed week ends the streak', () => {
    const d = days('2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05');
    expect(weeklyStreak(d, 3, now)).toBe(0);
  });
});

describe('weekTotals', () => {
  const MIN = 60_000;
  const workout = (day: number, minutes: number, setCount: number) => ({
    startedAt: at(10, day),
    endedAt: at(10, day) + minutes * MIN,
    setCount,
  });

  test('adds up this week’s sets and minutes, from Monday', () => {
    const totals = weekTotals([workout(9, 50, 20), workout(12, 45, 18), workout(14, 61, 22)], at(10, 15));
    expect(totals).toEqual({ sets: 40, minutes: 106 });
  });

  test('ignores a workout with no end', () => {
    expect(weekTotals([{ startedAt: at(10, 12), endedAt: null, setCount: 5 }], at(10, 15))).toEqual({
      sets: 5,
      minutes: 0,
    });
  });
});
