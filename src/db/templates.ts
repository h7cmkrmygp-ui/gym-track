import { PPL_PRESET } from '@/data/exercises.fr';

import { getDb } from './client';

export type Template = { id: number; name: string; rotationOrder: number | null; archived: boolean };

export type TemplateExercise = {
  exerciseId: number;
  name: string;
  targetSets: number;
  targetReps: number;
  restS: number;
};

export type TemplateWithExercises = Template & { exercises: TemplateExercise[] };

type TemplateRow = { id: number; name: string; rotation_order: number | null; archived: number };
const toTemplate = (r: TemplateRow): Template => ({
  id: r.id,
  name: r.name,
  rotationOrder: r.rotation_order,
  archived: r.archived === 1,
});

/** Active templates, rotation first (in order), then the others by name. */
export async function listTemplates(): Promise<Template[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TemplateRow>(
    `SELECT * FROM templates WHERE archived = 0
     ORDER BY rotation_order IS NULL, rotation_order, name COLLATE NOCASE`,
  );
  return rows.map(toTemplate);
}

export async function getTemplate(id: number): Promise<TemplateWithExercises | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<TemplateRow>('SELECT * FROM templates WHERE id = ?', id);
  if (!row) return null;
  const exercises = await db.getAllAsync<TemplateExercise>(
    `SELECT te.exercise_id AS exerciseId, e.name, te.target_sets AS targetSets,
            te.target_reps AS targetReps, te.rest_s AS restS
     FROM template_exercises te JOIN exercises e ON e.id = te.exercise_id
     WHERE te.template_id = ? ORDER BY te.position`,
    id,
  );
  return { ...toTemplate(row), exercises };
}

/** Creates (id null) or replaces a template and its exercise list. Returns its id. */
export async function saveTemplate(
  id: number | null,
  name: string,
  inRotation: boolean,
  exercises: TemplateExercise[],
): Promise<number> {
  const db = await getDb();
  let templateId = id;
  await db.withTransactionAsync(async () => {
    if (templateId === null) {
      const order = inRotation ? await nextRotationOrder() : null;
      const res = await db.runAsync('INSERT INTO templates (name, rotation_order) VALUES (?, ?)', name, order);
      templateId = res.lastInsertRowId;
    } else {
      const current = await db.getFirstAsync<TemplateRow>('SELECT * FROM templates WHERE id = ?', templateId);
      let order = current?.rotation_order ?? null;
      if (inRotation && order === null) order = await nextRotationOrder();
      if (!inRotation) order = null;
      await db.runAsync('UPDATE templates SET name = ?, rotation_order = ? WHERE id = ?', name, order, templateId);
      await db.runAsync('DELETE FROM template_exercises WHERE template_id = ?', templateId);
    }
    for (const [position, ex] of exercises.entries()) {
      await db.runAsync(
        `INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps, rest_s)
         VALUES (?, ?, ?, ?, ?, ?)`,
        templateId,
        ex.exerciseId,
        position,
        ex.targetSets,
        ex.targetReps,
        ex.restS,
      );
    }
  });
  return templateId!;
}

async function nextRotationOrder(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(rotation_order) + 1, 0) AS next FROM templates WHERE archived = 0',
  );
  return row?.next ?? 0;
}

/** Archived rather than deleted so past workouts keep their link. */
export async function archiveTemplate(id: number) {
  const db = await getDb();
  await db.runAsync('UPDATE templates SET archived = 1, rotation_order = NULL WHERE id = ?', id);
}

/** Swaps a rotation template with its neighbour. */
export async function moveInRotation(id: number, direction: -1 | 1) {
  const rotation = (await listTemplates()).filter((t) => t.rotationOrder !== null);
  const i = rotation.findIndex((t) => t.id === id);
  const j = i + direction;
  if (i === -1 || j < 0 || j >= rotation.length) return;
  [rotation[i], rotation[j]] = [rotation[j], rotation[i]];
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const [order, t] of rotation.entries()) {
      await db.runAsync('UPDATE templates SET rotation_order = ? WHERE id = ?', order, t.id);
    }
  });
}

export async function createPplPreset() {
  const db = await getDb();
  for (const [name, exercises] of PPL_PRESET) {
    const resolved: TemplateExercise[] = [];
    for (const [exName, sets, reps, rest] of exercises) {
      const ex = await db.getFirstAsync<{ id: number }>('SELECT id FROM exercises WHERE name = ?', exName);
      if (ex) resolved.push({ exerciseId: ex.id, name: exName, targetSets: sets, targetReps: reps, restS: rest });
    }
    await saveTemplate(null, name, true, resolved);
  }
}
