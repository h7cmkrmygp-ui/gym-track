import { planSets } from '@/logic/progression';
import { computeRecords, type ExerciseRecord, type LoggedSet } from '@/logic/records';
import { fromDisplay, weightStep } from '@/logic/units';
import { moveItem } from '@/logic/workout';

import { getDb } from './client';
import { getSettings } from './settings';
import { getTemplate } from './templates';

export type Workout = { id: number; templateId: number | null; name: string; startedAt: number; endedAt: number | null };

export type WorkoutSet = { id: number; exerciseId: number; weightKg: number; reps: number; completedAt: number | null };

export type PreviousSet = { weightKg: number; reps: number };

export type WorkoutExercise = {
  exerciseId: number;
  name: string;
  restS: number;
  /** Planned sets × reps when the workout comes from a template. */
  target: { sets: number; reps: number } | null;
  sets: WorkoutSet[];
  /** Sets from the last workout that included this exercise, for the "previous" column. */
  previous: PreviousSet[];
};

export type WorkoutDetail = Workout & { exercises: WorkoutExercise[] };

export type WorkoutSummary = Workout & { setCount: number; exerciseCount: number };

type WorkoutRow = { id: number; template_id: number | null; name: string; started_at: number; ended_at: number | null };
const toWorkout = (r: WorkoutRow): Workout => ({
  id: r.id,
  templateId: r.template_id,
  name: r.name,
  startedAt: r.started_at,
  endedAt: r.ended_at,
});

export async function getActiveWorkout(): Promise<Workout | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<WorkoutRow>(
    'SELECT * FROM workouts WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
  );
  return row ? toWorkout(row) : null;
}

/** Completed sets of the most recent workout before `before` that included the exercise. */
async function previousSets(exerciseId: number, before: number): Promise<PreviousSet[]> {
  const db = await getDb();
  return db.getAllAsync<PreviousSet>(
    `SELECT s.weight_kg AS weightKg, s.reps FROM sets s
     WHERE s.completed_at IS NOT NULL AND s.workout_id = (
       SELECT w.id FROM workouts w JOIN sets s2 ON s2.workout_id = w.id
       WHERE s2.exercise_id = ? AND s2.completed_at IS NOT NULL AND w.started_at < ?
       ORDER BY w.started_at DESC LIMIT 1
     ) AND s.exercise_id = ?
     ORDER BY s.position`,
    exerciseId,
    before,
    exerciseId,
  );
}

/** Prefills the exercise's sets from last time; `stepKg` > 0 adds weight when every target was hit. */
async function insertSets(
  workoutId: number,
  exerciseId: number,
  targetSets: number,
  targetReps: number,
  before: number,
  stepKg: number,
) {
  const db = await getDb();
  const plan = planSets(await previousSets(exerciseId, before), targetSets, targetReps, stepKg);
  const row = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(position) + 1, 0) AS next FROM sets WHERE workout_id = ?',
    workoutId,
  );
  let position = row?.next ?? 0;
  for (const set of plan) {
    await db.runAsync(
      'INSERT INTO sets (workout_id, exercise_id, position, weight_kg, reps) VALUES (?, ?, ?, ?, ?)',
      workoutId,
      exerciseId,
      position++,
      set.weightKg,
      set.reps,
    );
  }
}

/** Starts a workout from a template (prefilled with progression on last time) or an empty one. */
export async function startWorkout(templateId: number | null): Promise<number> {
  const db = await getDb();
  const template = templateId === null ? null : await getTemplate(templateId);
  const { unit } = await getSettings();
  const stepKg = fromDisplay(weightStep(unit), unit);
  const now = Date.now();
  const { lastInsertRowId: id } = await db.runAsync(
    'INSERT INTO workouts (template_id, name, started_at) VALUES (?, ?, ?)',
    template?.id ?? null,
    template?.name ?? 'Séance libre',
    now,
  );
  for (const ex of template?.exercises ?? []) {
    await insertSets(id, ex.exerciseId, ex.targetSets, ex.targetReps, now, stepKg);
  }
  return id;
}

export async function getWorkoutDetail(id: number): Promise<WorkoutDetail | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<WorkoutRow>('SELECT * FROM workouts WHERE id = ?', id);
  if (!row) return null;
  const workout = toWorkout(row);

  const sets = await db.getAllAsync<WorkoutSet & { name: string }>(
    `SELECT s.id, s.exercise_id AS exerciseId, s.weight_kg AS weightKg, s.reps, s.completed_at AS completedAt, e.name
     FROM sets s JOIN exercises e ON e.id = s.exercise_id
     WHERE s.workout_id = ? ORDER BY s.position`,
    id,
  );

  const template = workout.templateId === null ? null : await getTemplate(workout.templateId);
  const { restDefaultS } = await getSettings();

  // Exercises keep the order in which they first appear.
  const groups = new Map<number, WorkoutExercise>();
  for (const { name, ...set } of sets) {
    let group = groups.get(set.exerciseId);
    if (!group) {
      const planned = template?.exercises.find((e) => e.exerciseId === set.exerciseId);
      group = {
        exerciseId: set.exerciseId,
        name,
        restS: planned?.restS ?? restDefaultS,
        target: planned ? { sets: planned.targetSets, reps: planned.targetReps } : null,
        sets: [],
        previous: [],
      };
      groups.set(set.exerciseId, group);
    }
    group.sets.push(set);
  }
  for (const group of groups.values()) {
    group.previous = await previousSets(group.exerciseId, workout.startedAt);
  }
  return { ...workout, exercises: [...groups.values()] };
}

export async function addExerciseToWorkout(workoutId: number, exerciseId: number) {
  const db = await getDb();
  const w = await db.getFirstAsync<WorkoutRow>('SELECT * FROM workouts WHERE id = ?', workoutId);
  // No target reps outside a template, so no progression: just last time's numbers.
  await insertSets(workoutId, exerciseId, 3, 10, w?.started_at ?? Date.now(), 0);
}

/** Adds a set copying the exercise's last set in this workout. */
export async function addSet(workoutId: number, exerciseId: number) {
  const db = await getDb();
  const last = await db.getFirstAsync<{ weight_kg: number; reps: number }>(
    'SELECT weight_kg, reps FROM sets WHERE workout_id = ? AND exercise_id = ? ORDER BY position DESC LIMIT 1',
    workoutId,
    exerciseId,
  );
  await db.runAsync(
    `INSERT INTO sets (workout_id, exercise_id, position, weight_kg, reps)
     VALUES (?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM sets WHERE workout_id = ?), ?, ?)`,
    workoutId,
    exerciseId,
    workoutId,
    last?.weight_kg ?? 0,
    last?.reps ?? 10,
  );
}

export async function updateSet(setId: number, weightKg: number, reps: number) {
  const db = await getDb();
  await db.runAsync('UPDATE sets SET weight_kg = ?, reps = ? WHERE id = ?', weightKg, reps, setId);
}

export async function setSetDone(setId: number, done: boolean) {
  const db = await getDb();
  await db.runAsync('UPDATE sets SET completed_at = ? WHERE id = ?', done ? Date.now() : null, setId);
}

export async function deleteSet(setId: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM sets WHERE id = ?', setId);
}

/** Moves an exercise (all its sets) up or down; the order is the order of set positions. */
export async function moveExerciseInWorkout(workoutId: number, exerciseId: number, delta: -1 | 1) {
  const db = await getDb();
  const sets = await db.getAllAsync<{ id: number; exercise_id: number }>(
    'SELECT id, exercise_id FROM sets WHERE workout_id = ? ORDER BY position',
    workoutId,
  );
  const order = [...new Set(sets.map((s) => s.exercise_id))];
  const moved = moveItem(order, order.indexOf(exerciseId), delta);
  await db.withTransactionAsync(async () => {
    let position = 0;
    for (const id of moved) {
      for (const s of sets.filter((s) => s.exercise_id === id)) {
        await db.runAsync('UPDATE sets SET position = ? WHERE id = ?', position++, s.id);
      }
    }
  });
}

/** Sets with reps entered but not ticked: probably done, just not checked. */
export async function countUncheckedSets(workoutId: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM sets WHERE workout_id = ? AND completed_at IS NULL AND reps > 0',
    workoutId,
  );
  return row?.n ?? 0;
}

export async function completeUncheckedSets(workoutId: number) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE sets SET completed_at = ? WHERE workout_id = ? AND completed_at IS NULL AND reps > 0',
    Date.now(),
    workoutId,
  );
}

export async function removeExerciseFromWorkout(workoutId: number, exerciseId: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM sets WHERE workout_id = ? AND exercise_id = ?', workoutId, exerciseId);
}

/** Drops unchecked sets and closes the workout. A workout with nothing done is discarded. */
export async function finishWorkout(id: number): Promise<{ kept: boolean }> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sets WHERE workout_id = ? AND completed_at IS NULL', id);
  const done = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sets WHERE workout_id = ?', id);
  if (!done?.n) {
    await deleteWorkout(id);
    return { kept: false };
  }
  await db.runAsync('UPDATE workouts SET ended_at = COALESCE(ended_at, ?) WHERE id = ?', Date.now(), id);
  return { kept: true };
}

export async function deleteWorkout(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM workouts WHERE id = ?', id);
}

/** Template of the most recent finished workout that is part of the rotation. */
export async function lastRotationTemplateId(): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ template_id: number }>(
    `SELECT w.template_id FROM workouts w JOIN templates t ON t.id = w.template_id
     WHERE w.ended_at IS NOT NULL AND t.rotation_order IS NOT NULL AND t.archived = 0
     ORDER BY w.started_at DESC LIMIT 1`,
  );
  return row?.template_id ?? null;
}

export async function listFinishedWorkouts(): Promise<WorkoutSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<WorkoutRow & { set_count: number; exercise_count: number }>(
    `SELECT w.*, COUNT(s.id) AS set_count, COUNT(DISTINCT s.exercise_id) AS exercise_count
     FROM workouts w LEFT JOIN sets s ON s.workout_id = w.id
     WHERE w.ended_at IS NOT NULL
     GROUP BY w.id ORDER BY w.started_at DESC`,
  );
  return rows.map((r) => ({ ...toWorkout(r), setCount: r.set_count, exerciseCount: r.exercise_count }));
}

type SetRow = { exerciseId: number; workoutId: number; at: number; weightKg: number; reps: number };
const SET_COLUMNS = `s.exercise_id AS exerciseId, s.workout_id AS workoutId, s.completed_at AS at,
  s.weight_kg AS weightKg, s.reps`;

export async function completedSetsForExercise(exerciseId: number): Promise<LoggedSet[]> {
  const db = await getDb();
  return db.getAllAsync<SetRow>(
    `SELECT ${SET_COLUMNS} FROM sets s WHERE s.exercise_id = ? AND s.completed_at IS NOT NULL`,
    exerciseId,
  );
}

export async function allCompletedSets(): Promise<LoggedSet[]> {
  const db = await getDb();
  return db.getAllAsync<SetRow>(`SELECT ${SET_COLUMNS} FROM sets s WHERE s.completed_at IS NOT NULL`);
}

/** Records set in workouts that started before this one, to spot new PRs during it. */
export async function recordsBefore(workoutId: number): Promise<Map<number, ExerciseRecord>> {
  const db = await getDb();
  const sets = await db.getAllAsync<SetRow>(
    `SELECT ${SET_COLUMNS} FROM sets s JOIN workouts w ON w.id = s.workout_id
     WHERE s.completed_at IS NOT NULL
       AND w.started_at < (SELECT started_at FROM workouts WHERE id = ?)`,
    workoutId,
  );
  return computeRecords(sets);
}
