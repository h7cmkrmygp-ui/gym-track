import { computeRecords, e1rm, prFlags, progressSeries, type LoggedSet } from '../records';

const set = (p: Partial<LoggedSet>): LoggedSet => ({
  exerciseId: 1,
  workoutId: 1,
  at: 1000,
  weightKg: 100,
  reps: 5,
  ...p,
});

describe('e1rm', () => {
  test('uses the Epley formula', () => {
    expect(e1rm(100, 5)).toBeCloseTo(116.667, 2);
  });

  test('a single rep is the weight itself', () => {
    expect(e1rm(140, 1)).toBe(140);
  });

  test('zero reps give zero', () => {
    expect(e1rm(100, 0)).toBe(0);
  });
});

describe('computeRecords', () => {
  test('tracks heaviest weight and best e1rm separately per exercise', () => {
    const records = computeRecords([
      set({ weightKg: 100, reps: 8, at: 1 }),
      set({ weightKg: 110, reps: 2, at: 2 }),
      set({ exerciseId: 2, weightKg: 50, reps: 10, at: 3 }),
    ]);
    const bench = records.get(1)!;
    expect(bench.maxWeight).toEqual({ value: 110, at: 2 });
    expect(bench.bestE1rm.at).toBe(1);
    expect(bench.bestE1rm.value).toBeCloseTo(126.667, 2);
    expect(records.get(2)!.maxWeight.value).toBe(50);
  });

  test('ignores empty sets', () => {
    expect(computeRecords([set({ reps: 0 }), set({ weightKg: 0 })]).size).toBe(0);
  });
});

describe('prFlags', () => {
  const previous = { maxWeight: { value: 100, at: 1 }, bestE1rm: { value: 116.67, at: 1 } };

  test('no badge the first time an exercise is done', () => {
    expect(prFlags(set({}), undefined)).toEqual({ weight: false, e1rm: false });
  });

  test('flags a heavier weight', () => {
    expect(prFlags(set({ weightKg: 102.5, reps: 1 }), previous)).toEqual({ weight: true, e1rm: false });
  });

  test('flags a better estimated max at the same weight', () => {
    expect(prFlags(set({ weightKg: 100, reps: 6 }), previous)).toEqual({ weight: false, e1rm: true });
  });

  test('equalling a record is not a new record', () => {
    expect(prFlags(set({ weightKg: 100, reps: 5 }), previous)).toEqual({ weight: false, e1rm: false });
  });
});

describe('progressSeries', () => {
  test('gives one point per workout in date order', () => {
    const series = progressSeries([
      set({ workoutId: 2, at: 20, weightKg: 105, reps: 3 }),
      set({ workoutId: 1, at: 10, weightKg: 100, reps: 5 }),
      set({ workoutId: 1, at: 11, weightKg: 90, reps: 10 }),
    ]);
    expect(series.map((p) => p.workoutId)).toEqual([1, 2]);
    expect(series[0].maxWeight).toBe(100);
    expect(series[0].bestE1rm).toBeCloseTo(120, 2);
    expect(series[0].at).toBe(10);
  });
});
