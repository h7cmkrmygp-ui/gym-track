import { formatWeight, fromDisplay, toDisplay, weightStep } from '../units';

describe('units', () => {
  test('kg values are shown unchanged', () => {
    expect(toDisplay(100, 'kg')).toBe(100);
  });

  test('pounds are converted to kg for storage', () => {
    expect(fromDisplay(225, 'lbs')).toBeCloseTo(102.058, 3);
  });

  test('a weight entered in pounds is shown back as the same number', () => {
    expect(toDisplay(fromDisplay(225, 'lbs'), 'lbs')).toBe(225);
    expect(toDisplay(fromDisplay(137.5, 'lbs'), 'lbs')).toBe(137.5);
  });

  test('formatWeight drops a trailing .0 and adds the unit', () => {
    expect(formatWeight(fromDisplay(225, 'lbs'), 'lbs')).toBe('225 lbs');
    expect(formatWeight(62.5, 'kg')).toBe('62.5 kg');
  });
});

describe('weightStep', () => {
  test('steps by 2.5 kg or 5 lbs', () => {
    expect(weightStep('kg')).toBe(2.5);
    expect(weightStep('lbs')).toBe(5);
  });
});
