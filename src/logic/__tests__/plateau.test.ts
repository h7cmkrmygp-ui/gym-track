import { deloadWeight, isPlateau } from '../plateau';

const point = (bestE1rm: number, i: number) => ({ workoutId: i, at: i, maxWeight: bestE1rm, bestE1rm });
const series = (...values: number[]) => values.map(point);

describe('isPlateau', () => {
  test('needs a best to compare with plus three sessions', () => {
    expect(isPlateau(series(100, 100, 100))).toBe(false);
  });

  test('three sessions without beating the earlier best is a plateau', () => {
    expect(isPlateau(series(90, 100, 98, 100, 99))).toBe(true);
  });

  test('a new best in the last three sessions is progress', () => {
    expect(isPlateau(series(90, 100, 98, 101, 99))).toBe(false);
  });

  test('progress before the last three sessions does not hide a plateau', () => {
    expect(isPlateau(series(80, 90, 100, 95, 97, 99))).toBe(true);
  });
});

describe('deloadWeight', () => {
  test('takes 10 % off, rounded down to a 5 lbs step', () => {
    // 225 lbs → 202.5 → 200 lbs.
    expect(deloadWeight(102.0582, 'lbs')).toBeCloseTo(90.718, 2);
  });

  test('rounds down to a 2.5 kg step', () => {
    expect(deloadWeight(100, 'kg')).toBe(90);
    expect(deloadWeight(62.5, 'kg')).toBe(55);
  });
});
