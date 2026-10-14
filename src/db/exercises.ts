import { getDb } from './client';

export type Exercise = { id: number; name: string; muscleGroup: string; isCustom: boolean };

type Row = { id: number; name: string; muscle_group: string; is_custom: number };
const toExercise = (r: Row): Exercise => ({
  id: r.id,
  name: r.name,
  muscleGroup: r.muscle_group,
  isCustom: r.is_custom === 1,
});

export async function listExercises(): Promise<Exercise[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>('SELECT * FROM exercises ORDER BY name COLLATE NOCASE');
  return rows.map(toExercise);
}

export async function getExercise(id: number): Promise<Exercise | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('SELECT * FROM exercises WHERE id = ?', id);
  return row ? toExercise(row) : null;
}

/** Exercises that have at least one completed set, for the progress screen. */
export async function listTrainedExercises(): Promise<Exercise[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT e.* FROM exercises e
     WHERE EXISTS (SELECT 1 FROM sets s WHERE s.exercise_id = e.id AND s.completed_at IS NOT NULL)
     ORDER BY e.name COLLATE NOCASE`,
  );
  return rows.map(toExercise);
}

export async function createExercise(name: string, muscleGroup: string): Promise<Exercise> {
  const db = await getDb();
  const existing = await db.getFirstAsync<Row>('SELECT * FROM exercises WHERE name = ? COLLATE NOCASE', name);
  if (existing) return toExercise(existing);
  const { lastInsertRowId } = await db.runAsync(
    'INSERT INTO exercises (name, muscle_group, is_custom) VALUES (?, ?, 1)',
    name,
    muscleGroup,
  );
  return { id: lastInsertRowId, name, muscleGroup, isCustom: true };
}
