import { useSyncExternalStore } from 'react';

import { endRestActivity, showRestActivity } from '@/live-activity';
import { cancelNotification, scheduleRestDone } from '@/notifications';

/** One rest timer for the whole app, so it survives leaving the workout screen. */
type RestTimer = { endsAt: number; totalS: number; exerciseName: string; notificationId: string | null };

let timer: RestTimer | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function run(seconds: number, totalS: number, exerciseName: string) {
  // Replace the previous timer without ending its Live Activity, which is updated in place.
  const previousId = timer?.notificationId;
  if (previousId) await cancelNotification(previousId);
  const endsAt = Date.now() + seconds * 1000;
  const t: RestTimer = { endsAt, totalS, exerciseName, notificationId: null };
  timer = t;
  emit();
  showRestActivity({ exercise: exerciseName, startedAt: endsAt - totalS * 1000, endsAt });
  const id = await scheduleRestDone(seconds, exerciseName);
  // The timer may have been stopped or restarted while scheduling.
  if (timer === t) t.notificationId = id;
  else if (id) await cancelNotification(id);
}

export function startRest(seconds: number, exerciseName: string) {
  return run(seconds, seconds, exerciseName);
}

export function addRest(seconds: number) {
  if (!timer) return;
  const remaining = Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000)) + seconds;
  return run(remaining, timer.totalS + seconds, timer.exerciseName);
}

export async function stopRest() {
  const id = timer?.notificationId;
  timer = null;
  emit();
  endRestActivity();
  if (id) await cancelNotification(id);
}

export function useRestTimer(): RestTimer | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => timer,
  );
}
