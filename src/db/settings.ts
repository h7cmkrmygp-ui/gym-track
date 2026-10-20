import type { Unit } from '@/logic/units';

import { getDb } from './client';

export type Settings = {
  unit: Unit;
  /** Rest after a set when the exercise has no rest time of its own. */
  restDefaultS: number;
  /** Gym days per week that keep the streak going. */
  weeklyGoal: number;
  /** Weekly goals of the other two activity rings. */
  setsGoal: number;
  minutesGoal: number;
  /** Sunday evening notification with the week's summary. */
  weeklySummary: boolean;
  /** Nudge after this many days without the gym; 0 turns it off. */
  inactivityDays: number;
  /** Last automatic backup kept inside the app. */
  lastSnapshotAt: number | null;
  /** Last backup exported off the phone (share sheet). */
  lastExportAt: number | null;
  /** True from launch until the app has stayed open a few seconds: still true means it crashed. */
  launchPending: boolean;
  /** Where the workout screen was scrolled, to reopen it there. */
  workoutScroll: { workoutId: number; y: number } | null;
};

const DEFAULTS: Settings = {
  unit: 'lbs',
  restDefaultS: 90,
  weeklyGoal: 3,
  setsGoal: 60,
  minutesGoal: 180,
  weeklySummary: true,
  inactivityDays: 3,
  lastSnapshotAt: null,
  lastExportAt: null,
  launchPending: false,
  workoutScroll: null,
};

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored = Object.fromEntries(rows.map((r) => [r.key, JSON.parse(r.value)]));
  return { ...DEFAULTS, ...stored };
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value),
  );
}
