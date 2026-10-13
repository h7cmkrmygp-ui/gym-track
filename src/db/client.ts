import * as SQLite from 'expo-sqlite';

import { STARTER_EXERCISES } from '@/data/exercises.fr';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Shared connection, used both by screens and by the background geofence task. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= open().catch((e) => {
    dbPromise = null;
    throw e;
  });
  return dbPromise;
}

async function open() {
  const db = await SQLite.openDatabaseAsync('gym.db');
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
  return db;
}

const MIGRATIONS: ((db: SQLite.SQLiteDatabase) => Promise<void>)[] = [
  async (db) => {
    await db.execAsync(`
      CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      CREATE TABLE gyms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        radius_m INTEGER NOT NULL DEFAULT 100
      );
      CREATE TABLE visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gym_id INTEGER REFERENCES gyms(id) ON DELETE SET NULL,
        start_at INTEGER NOT NULL,
        end_at INTEGER,
        source TEXT NOT NULL
      );
      CREATE INDEX visits_gym ON visits(gym_id, start_at);
      CREATE TABLE exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        muscle_group TEXT NOT NULL,
        is_custom INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rotation_order INTEGER,
        archived INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE template_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        position INTEGER NOT NULL,
        target_sets INTEGER NOT NULL DEFAULT 3,
        target_reps INTEGER NOT NULL DEFAULT 10,
        rest_s INTEGER NOT NULL DEFAULT 90
      );
      CREATE TABLE workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER
      );
      CREATE TABLE sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        position INTEGER NOT NULL,
        weight_kg REAL NOT NULL DEFAULT 0,
        reps INTEGER NOT NULL DEFAULT 0,
        completed_at INTEGER
      );
      CREATE INDEX sets_workout ON sets(workout_id);
      CREATE INDEX sets_exercise ON sets(exercise_id);
      CREATE TABLE bodyweight (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        weight_kg REAL NOT NULL
      );
    `);
    for (const [name, group] of STARTER_EXERCISES) {
      await db.runAsync('INSERT INTO exercises (name, muscle_group) VALUES (?, ?)', name, group);
    }
  },
];

async function migrate(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  for (let v = version; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(() => MIGRATIONS[v](db));
    await db.execAsync(`PRAGMA user_version = ${v + 1}`);
  }
}
