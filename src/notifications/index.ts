import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return asked.granted;
}

/** Fires when the rest is over, even with the phone locked. Returns the id to cancel it. */
export async function scheduleRestDone(seconds: number, exerciseName: string): Promise<string | null> {
  if (!(await ensureNotificationPermission())) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Repos terminé ⏱️', body: `Prochaine série : ${exerciseName}`, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, seconds) },
  });
}

export async function cancelNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/** Action button on the arrival notification; see `handleNotificationResponse`. */
export const START_WORKOUT_ACTION = 'start';
const ARRIVAL_CATEGORY = 'arrival';

export async function notifyArrival(gymName: string, next: { id: number; name: string } | null) {
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  if (next) {
    // Button titles are fixed per category, so it is re-registered with this workout's name.
    await Notifications.setNotificationCategoryAsync(ARRIVAL_CATEGORY, [
      { identifier: START_WORKOUT_ACTION, buttonTitle: `Commencer ${next.name}`, options: { opensAppToForeground: true } },
    ]);
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `T'es à ${gymName} 💪`,
      body: next ? `Prochaine séance : ${next.name}. Maintiens pour la commencer.` : 'Jour de gym enregistré.',
      data: next ? { url: '/', templateId: next.id } : { url: '/' },
      categoryIdentifier: next ? ARRIVAL_CATEGORY : undefined,
    },
    trigger: null,
  });
}
