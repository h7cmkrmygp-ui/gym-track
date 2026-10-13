import { isCountedVisit, planEnter, type Visit } from '../visits';

const MIN = 60_000;
const HOUR = 60 * MIN;
const now = new Date(2026, 9, 12, 18, 0).getTime();

function visit(partial: Partial<Visit>): Visit {
  return { id: 1, gymId: 1, startAt: now - HOUR, endAt: null, source: 'geofence', ...partial };
}

describe('planEnter', () => {
  test('creates a visit when there is no previous one', () => {
    expect(planEnter(null, now)).toEqual({ action: 'create' });
  });

  test('ignores a repeated enter while a recent visit is still open', () => {
    expect(planEnter(visit({ startAt: now - 20 * MIN }), now)).toEqual({ action: 'none' });
  });

  test('reopens a visit that ended less than 30 minutes ago', () => {
    const last = visit({ id: 7, startAt: now - HOUR, endAt: now - 10 * MIN });
    expect(planEnter(last, now)).toEqual({ action: 'reopen', id: 7 });
  });

  test('creates a new visit when the last one ended long ago', () => {
    const last = visit({ startAt: now - 5 * HOUR, endAt: now - 4 * HOUR });
    expect(planEnter(last, now)).toEqual({ action: 'create' });
  });

  test('closes a stale open visit before creating a new one', () => {
    const start = now - 24 * HOUR;
    const last = visit({ id: 3, startAt: start, endAt: null });
    expect(planEnter(last, now)).toEqual({
      action: 'create',
      closeStale: { id: 3, endAt: start + 2 * HOUR },
    });
  });
});

describe('isCountedVisit', () => {
  test('a visit shorter than 10 minutes is a drive-by', () => {
    expect(isCountedVisit(visit({ startAt: now - 30 * MIN, endAt: now - 25 * MIN }), now)).toBe(false);
  });

  test('a visit of 10 minutes or more counts', () => {
    expect(isCountedVisit(visit({ startAt: now - 30 * MIN, endAt: now - 20 * MIN }), now)).toBe(true);
  });

  test('an open visit counts once 10 minutes have passed', () => {
    expect(isCountedVisit(visit({ startAt: now - 5 * MIN }), now)).toBe(false);
    expect(isCountedVisit(visit({ startAt: now - 15 * MIN }), now)).toBe(true);
  });

  test('a manual check-in always counts', () => {
    expect(isCountedVisit(visit({ source: 'manual', startAt: now - MIN }), now)).toBe(true);
  });
});
