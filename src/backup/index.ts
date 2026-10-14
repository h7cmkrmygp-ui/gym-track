import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { exportBackup, importBackup } from '@/db/backup';
import { getSettings, setSetting } from '@/db/settings';
import { isDue, snapshotName, snapshotsToDelete } from '@/logic/backup';
import { dayKey } from '@/logic/stats';

const SNAPSHOT_EVERY_DAYS = 7;
const SNAPSHOTS_KEPT = 8;
/** An export older than this earns a reminder on the home screen. */
export const EXPORT_REMINDER_DAYS = 14;

function snapshotDir(): Directory {
  const dir = new Directory(Paths.document, 'Sauvegardes');
  if (!dir.exists) dir.create({ idempotent: true });
  return dir;
}

/**
 * Weekly copy of all data inside the app, keeping the last 8. It protects against
 * mistakes (a bad import, a bug), not against deleting the app: that needs an export.
 */
export async function snapshotIfDue(now = Date.now()) {
  const { lastSnapshotAt } = await getSettings();
  if (!isDue(lastSnapshotAt, now, SNAPSHOT_EVERY_DAYS)) return;
  const dir = snapshotDir();
  const file = new File(dir, snapshotName(now));
  file.create({ overwrite: true });
  file.write(JSON.stringify(await exportBackup()));
  for (const name of snapshotsToDelete(dir.list().map((e) => e.name), SNAPSHOTS_KEPT)) {
    new File(dir, name).delete();
  }
  await setSetting('lastSnapshotAt', now);
}

export type Snapshot = { name: string; uri: string; date: string };

/** Automatic backups, newest first. */
export function listSnapshots(): Snapshot[] {
  return snapshotDir()
    .list()
    .filter((e): e is File => e instanceof File && e.name.startsWith('gymtrack-'))
    .map((f) => ({ name: f.name, uri: f.uri, date: f.name.slice('gymtrack-'.length, -'.json'.length) }))
    .sort((a, b) => b.name.localeCompare(a.name));
}

/** Opens the share sheet with a backup file (to save in Files, iCloud Drive, OneDrive…). */
export async function shareBackup() {
  const file = new File(Paths.cache, `gymtrack-${dayKey(Date.now())}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(await exportBackup()));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
  await setSetting('lastExportAt', Date.now());
}

/** Replaces all data with a backup file's content. Throws with a readable message. */
export async function restoreFromFile(uri: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await new File(uri).text());
  } catch {
    throw new Error('Fichier illisible. Choisis un fichier exporté depuis GymTrack.');
  }
  await importBackup(parsed);
}
