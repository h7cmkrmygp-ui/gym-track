import { dayKey } from './stats';

const DAY = 86_400_000;
const PREFIX = 'gymtrack-';

export function isDue(lastAt: number | null, now: number, intervalDays: number): boolean {
  return lastAt === null || now - lastAt >= intervalDays * DAY;
}

/** "gymtrack-2026-10-14.json": dated so that names sort from oldest to newest. */
export function snapshotName(now: number): string {
  return `${PREFIX}${dayKey(now)}.json`;
}

/** The automatic backups beyond the `keep` newest ones. Other files are left alone. */
export function snapshotsToDelete(names: string[], keep: number): string[] {
  return names
    .filter((n) => n.startsWith(PREFIX) && n.endsWith('.json'))
    .sort()
    .reverse()
    .slice(keep)
    .reverse();
}
