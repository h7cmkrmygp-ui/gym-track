import { daysSince, inactivityReminderAt } from '../reminder';

const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).getTime();
const time = (ts: number | null) => (ts === null ? null : new Date(ts));

describe('daysSince', () => {
  test('counts calendar days', () => {
    expect(daysSince('2026-10-10', at(14, 8))).toBe(4);
    expect(daysSince('2026-10-14', at(14, 23))).toBe(0);
  });
});

describe('inactivityReminderAt', () => {
  test('is the evening of the day the gap is reached', () => {
    // Last gym day the 10th, 3-day gap: the 13th at 18:00.
    expect(time(inactivityReminderAt('2026-10-10', at(11), 3, 18))).toEqual(new Date(2026, 9, 13, 18));
  });

  test('when already overdue, is the next 18:00', () => {
    expect(time(inactivityReminderAt('2026-10-01', at(14, 12), 3, 18))).toEqual(new Date(2026, 9, 14, 18));
    expect(time(inactivityReminderAt('2026-10-01', at(14, 20), 3, 18))).toEqual(new Date(2026, 9, 15, 18));
  });

  test('is off without any gym day yet or when disabled', () => {
    expect(inactivityReminderAt(null, at(14), 3, 18)).toBeNull();
    expect(inactivityReminderAt('2026-10-10', at(14), 0, 18)).toBeNull();
  });
});
