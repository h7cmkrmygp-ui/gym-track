import { Platform } from 'react-native';

import { listVisits } from '@/db/gyms';
import { getSettings } from '@/db/settings';
import { getTemplate, listTemplates } from '@/db/templates';
import { lastRotationTemplateId, listFinishedWorkouts } from '@/db/workouts';
import { isExpoGo } from '@/env';
import { nextInRotation } from '@/logic/rotation';
import { attendanceDays } from '@/logic/stats';
import { widgetTimeline, type WidgetInput } from '@/logic/widget';

async function loadWidgetInput(now: number): Promise<WidgetInput> {
  const [settings, visits, workouts, templates, lastId] = await Promise.all([
    getSettings(),
    listVisits(),
    listFinishedWorkouts(),
    listTemplates(),
    lastRotationTemplateId(),
  ]);
  const next = nextInRotation(templates, lastId);
  const nextTemplate = next ? await getTemplate(next.id) : null;
  const last = workouts[0];
  return {
    days: attendanceDays(visits, workouts.map((w) => w.startedAt), now),
    goal: settings.weeklyGoal,
    next: nextTemplate ? { name: nextTemplate.name, exercises: nextTemplate.exercises.map((e) => e.name) } : null,
    lastWorkout: last ? { name: last.name, startedAt: last.startedAt, setCount: last.setCount } : null,
  };
}

/** Pushes fresh data to the home screen widget. A no-op where widgets are unavailable. */
export async function refreshWidget() {
  if (Platform.OS !== 'ios' || isExpoGo) return;
  try {
    // Loaded lazily: the native widgets module does not exist in Expo Go.
    const { default: GymWidget } = await import('./gym-widget');
    const now = Date.now();
    const entries = widgetTimeline(await loadWidgetInput(now), now);
    GymWidget.updateTimeline(entries.map((e) => ({ date: new Date(e.date), props: e.props })));
  } catch (e) {
    console.warn('Widget update failed', e);
  }
}
