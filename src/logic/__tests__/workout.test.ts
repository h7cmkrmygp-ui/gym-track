import { formatDuration, moveItem } from '../workout';

describe('moveItem', () => {
  test('moves an item up', () => {
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
  });

  test('moves an item down', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });

  test('leaves the list as is at either end', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });

  test('does not change the original list', () => {
    const list = ['a', 'b'];
    moveItem(list, 0, 1);
    expect(list).toEqual(['a', 'b']);
  });
});

describe('formatDuration', () => {
  const MIN = 60_000;

  test('shows minutes under an hour', () => {
    expect(formatDuration(42 * MIN + 30_000)).toBe('42 min');
    expect(formatDuration(20_000)).toBe('0 min');
  });

  test('shows hours and padded minutes from an hour', () => {
    expect(formatDuration(65 * MIN)).toBe('1 h 05');
  });
});
