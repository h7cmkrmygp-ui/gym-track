import { relativeDay, widgetData, widgetTimeline, type WidgetInput } from '../widget';

// Wednesday 14 October 2026, 18:00 local time.
const at = (month: number, day: number, hour = 18) => new Date(2026, month - 1, day, hour).getTime();
const now = at(10, 14);

const input: WidgetInput = {
  days: new Set(['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12', '2026-10-13']),
  goal: 3,
  next: { name: 'Pull', exercises: ['Tractions', 'Rowing barre'] },
  lastWorkout: { name: 'Push', startedAt: at(10, 13), setCount: 18 },
};

describe('relativeDay', () => {
  test('names today and yesterday, then counts days', () => {
    expect(relativeDay(at(10, 14, 7), now)).toBe('aujourd’hui');
    expect(relativeDay(at(10, 13, 23), now)).toBe('hier');
    expect(relativeDay(at(10, 11), now)).toBe('il y a 3 j');
  });
});

describe('widgetData', () => {
  test('summarises the current week from Monday', () => {
    const data = widgetData(input, now);
    expect(data.week).toBe(2);
    expect(data.goal).toBe(3);
    expect(data.weekDays).toEqual([true, true, false, false, false, false, false]);
    expect(data.todayIndex).toBe(2);
  });

  test('keeps the streak of the previous weeks while this one is in progress', () => {
    expect(widgetData(input, now).streak).toBe(1);
  });

  test('describes the next and the last workout', () => {
    const data = widgetData(input, now);
    expect(data.next).toBe('Pull');
    expect(data.nextExercises).toEqual(['Tractions', 'Rowing barre']);
    expect(data.last).toBe('Push · hier · 18 séries');
  });

  test('handles no split and no workout yet', () => {
    const data = widgetData({ days: new Set(), goal: 3, next: null, lastWorkout: null }, now);
    expect(data.next).toBeNull();
    expect(data.nextExercises).toEqual([]);
    expect(data.last).toBeNull();
  });
});

describe('widgetTimeline', () => {
  test('starts now, then refreshes at each of the next 7 midnights', () => {
    const entries = widgetTimeline(input, now);
    expect(entries).toHaveLength(8);
    expect(entries[0].date).toBe(now);
    expect(new Date(entries[1].date)).toEqual(new Date(2026, 9, 15, 0, 0, 0, 0));
    expect(new Date(entries[7].date)).toEqual(new Date(2026, 9, 21, 0, 0, 0, 0));
  });

  test('the week resets on Monday', () => {
    const monday = widgetTimeline(input, now).find((e) => new Date(e.date).getDay() === 1)!;
    expect(monday.props.week).toBe(0);
    expect(monday.props.weekDays.every((d) => !d)).toBe(true);
    expect(monday.props.todayIndex).toBe(0);
  });

  test('the last workout label ages with each entry', () => {
    expect(widgetTimeline(input, now)[1].props.last).toBe('Push · il y a 2 j · 18 séries');
  });
});
