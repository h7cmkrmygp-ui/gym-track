import { planEnter, type Visit } from '@/logic/visits';

import { getDb } from './client';

export type Gym = { id: number; name: string; lat: number; lng: number; radiusM: number };

export async function listGyms(): Promise<Gym[]> {
  const db = await getDb();
  return db.getAllAsync<Gym>('SELECT id, name, lat, lng, radius_m AS radiusM FROM gyms ORDER BY id');
}

export async function addGym(name: string, lat: number, lng: number, radiusM = 100): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync('INSERT INTO gyms (name, lat, lng, radius_m) VALUES (?, ?, ?, ?)', name, lat, lng, radiusM);
  return res.lastInsertRowId;
}

export async function getGym(id: number): Promise<Gym | null> {
  const db = await getDb();
  return db.getFirstAsync<Gym>('SELECT id, name, lat, lng, radius_m AS radiusM FROM gyms WHERE id = ?', id);
}

export async function updateGym(id: number, name: string, lat: number, lng: number, radiusM: number) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE gyms SET name = ?, lat = ?, lng = ?, radius_m = ? WHERE id = ?',
    name,
    lat,
    lng,
    radiusM,
    id,
  );
}

export async function deleteGym(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM gyms WHERE id = ?', id);
}

type VisitRow = { id: number; gym_id: number | null; start_at: number; end_at: number | null; source: Visit['source'] };
const toVisit = (r: VisitRow): Visit => ({
  id: r.id,
  gymId: r.gym_id,
  startAt: r.start_at,
  endAt: r.end_at,
  source: r.source,
});

export async function listVisits(): Promise<Visit[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<VisitRow>('SELECT * FROM visits ORDER BY start_at');
  return rows.map(toVisit);
}

/** The visit in progress (geofence or manual check-in today), if any. */
export async function currentVisit(): Promise<(Visit & { gymName: string | null }) | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<VisitRow & { gym_name: string | null }>(
    `SELECT v.*, g.name AS gym_name FROM visits v LEFT JOIN gyms g ON g.id = v.gym_id
     WHERE v.end_at IS NULL ORDER BY v.start_at DESC LIMIT 1`,
  );
  return row ? { ...toVisit(row), gymName: row.gym_name } : null;
}

/** Applies a geofence "enter". Returns true when a new visit started (worth a notification). */
export async function recordEnter(gymId: number, now: number): Promise<boolean> {
  const db = await getDb();
  const last = await db.getFirstAsync<VisitRow>(
    "SELECT * FROM visits WHERE gym_id = ? AND source = 'geofence' ORDER BY start_at DESC LIMIT 1",
    gymId,
  );
  const plan = planEnter(last ? toVisit(last) : null, now);
  if (plan.action === 'none') return false;
  if (plan.action === 'reopen') {
    await db.runAsync('UPDATE visits SET end_at = NULL WHERE id = ?', plan.id);
    return false;
  }
  if (plan.closeStale) {
    await db.runAsync('UPDATE visits SET end_at = ? WHERE id = ?', plan.closeStale.endAt, plan.closeStale.id);
  }
  await db.runAsync("INSERT INTO visits (gym_id, start_at, source) VALUES (?, ?, 'geofence')", gymId, now);
  return true;
}

export async function recordExit(gymId: number, now: number) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE visits SET end_at = ? WHERE gym_id = ? AND source = 'geofence' AND end_at IS NULL",
    now,
    gymId,
  );
}

/** "Je suis à la salle" for a gym without a zone. Closed right away: it only marks the day. */
export async function manualCheckIn(now: number) {
  const db = await getDb();
  await db.runAsync("INSERT INTO visits (gym_id, start_at, end_at, source) VALUES (NULL, ?, ?, 'manual')", now, now);
}
