import { isDue, snapshotName, snapshotsToDelete } from '../backup';

const DAY = 86_400_000;
const now = new Date(2026, 9, 14, 18, 0).getTime();

describe('isDue', () => {
  test('is due when there was never a backup', () => {
    expect(isDue(null, now, 7)).toBe(true);
  });

  test('is due once the interval has passed', () => {
    expect(isDue(now - 7 * DAY, now, 7)).toBe(true);
    expect(isDue(now - 6 * DAY, now, 7)).toBe(false);
  });
});

describe('snapshotName', () => {
  test('is dated, so names sort by age', () => {
    expect(snapshotName(now)).toBe('gymtrack-2026-10-14.json');
  });
});

describe('snapshotsToDelete', () => {
  test('keeps the newest ones and ignores other files', () => {
    const names = [
      'gymtrack-2026-09-30.json',
      'notes.txt',
      'gymtrack-2026-10-14.json',
      'gymtrack-2026-10-07.json',
    ];
    expect(snapshotsToDelete(names, 2)).toEqual(['gymtrack-2026-09-30.json']);
  });
});
