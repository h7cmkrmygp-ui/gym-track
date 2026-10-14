import { planSets } from '../progression';

const STEP = 2.5;

describe('planSets', () => {
  test('without history, starts empty at the target reps', () => {
    expect(planSets([], 3, 8, STEP)).toEqual([
      { weightKg: 0, reps: 8 },
      { weightKg: 0, reps: 8 },
      { weightKg: 0, reps: 8 },
    ]);
  });

  test('adds one step when every set reached the target last time', () => {
    const last = [
      { weightKg: 100, reps: 8 },
      { weightKg: 100, reps: 9 },
      { weightKg: 95, reps: 8 },
    ];
    expect(planSets(last, 3, 8, STEP)).toEqual([
      { weightKg: 102.5, reps: 8 },
      { weightKg: 102.5, reps: 8 },
      { weightKg: 97.5, reps: 8 },
    ]);
  });

  test('repeats last time when a set fell short', () => {
    const last = [
      { weightKg: 100, reps: 8 },
      { weightKg: 100, reps: 6 },
    ];
    expect(planSets(last, 2, 8, STEP)).toEqual(last);
  });

  test('does not add weight to bodyweight exercises', () => {
    const last = [{ weightKg: 0, reps: 12 }];
    expect(planSets(last, 1, 10, STEP)).toEqual([{ weightKg: 0, reps: 12 }]);
  });

  test('repeats the last set when the target asks for more sets than last time', () => {
    const last = [{ weightKg: 60, reps: 6 }];
    expect(planSets(last, 3, 8, STEP)).toEqual([
      { weightKg: 60, reps: 6 },
      { weightKg: 60, reps: 6 },
      { weightKg: 60, reps: 6 },
    ]);
  });

  test('a step of zero only copies last time', () => {
    const last = [{ weightKg: 60, reps: 12 }];
    expect(planSets(last, 1, 10, 0)).toEqual([{ weightKg: 60, reps: 12 }]);
  });
});
