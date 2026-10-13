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

export async function notifyArrival(gymName: string, nextWorkout: string | null) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `T'es à ${gymName} 💪`,
      body: nextWorkout ? `Prochaine séance : ${nextWorkout}. Touche pour commencer.` : 'Jour de gym enregistré.',
      data: { url: '/' },
    },
    trigger: null,
  });
}
