import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { getActiveWorkout, startWorkout } from '@/db/workouts';

import { START_WORKOUT_ACTION } from './index';

// A launch from a notification can be reported both by the listener and by
// getLastNotificationResponseAsync; handle each response once.
const handled = new Set<string>();

/** Tap on a notification: "Commencer …" starts (or resumes) the workout, a plain tap opens the home tab. */
export async function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
  if (handled.has(key)) return;
  handled.add(key);

  const data = response.notification.request.content.data;
  if (response.actionIdentifier === START_WORKOUT_ACTION && typeof data?.templateId === 'number') {
    const active = await getActiveWorkout();
    const id = active?.id ?? (await startWorkout(data.templateId));
    router.push(`/workout/${id}`);
  } else if (data?.url === '/') {
    router.navigate('/');
  }
}
