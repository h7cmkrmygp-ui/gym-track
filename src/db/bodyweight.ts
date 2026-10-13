import { getDb } from './client';

export type BodyweightEntry = { id: number; date: string; weightKg: number };

export async function listBodyweight(): Promise<BodyweightEntry[]> {
  const db = await getDb();
  return db.getAllAsync<BodyweightEntry>('SELECT id, date, weight_kg AS weightKg FROM bodyweight ORDER BY date');
}

/** One entry per day; logging again the same day replaces it. */
export async function logBodyweight(date: string, weightKg: number) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO bodyweight (date, weight_kg) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg',
    date,
    weightKg,
  );
}

export async function deleteBodyweight(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM bodyweight WHERE id = ?', id);
}
