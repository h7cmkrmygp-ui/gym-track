import { getDb } from './client';

// Parents before children, so foreign keys hold while restoring.
const TABLES = ['settings', 'gyms', 'exercises', 'templates', 'template_exercises', 'workouts', 'sets', 'visits', 'bodyweight'];

export type Backup = { app: 'gymtrack'; version: 1; exportedAt: number; tables: Record<string, Record<string, unknown>[]> };

export async function exportBackup(): Promise<Backup> {
  const db = await getDb();
  const tables: Backup['tables'] = {};
  for (const t of TABLES) tables[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  return { app: 'gymtrack', version: 1, exportedAt: Date.now(), tables };
}

/** Replaces every table with the backup's content. */
export async function importBackup(data: unknown) {
  const backup = data as Backup;
  if (backup?.app !== 'gymtrack' || backup.version !== 1 || typeof backup.tables !== 'object') {
    throw new Error('Ce fichier n’est pas une sauvegarde GymTrack.');
  }
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of [...TABLES].reverse()) await db.runAsync(`DELETE FROM ${t}`);
    for (const t of TABLES) {
      for (const row of backup.tables[t] ?? []) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        await db.runAsync(
          `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          cols.map((c) => row[c] as string | number | null),
        );
      }
    }
  });
}
