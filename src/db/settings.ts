import type { Unit } from '@/logic/units';

import { getDb } from './client';

export type Settings = {
  unit: Unit;
  /** Rest after a set when the exercise has no rest time of its own. */
  restDefaultS: number;
  /** Gym days per week that keep the streak going. */
  weeklyGoal: number;
};

const DEFAULTS: Settings = { unit: 'lbs', restDefaultS: 90, weeklyGoal: 3 };

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
