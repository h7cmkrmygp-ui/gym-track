import * as Notifications from 'expo-notifications';

import { listVisits } from '@/db/gyms';
import { getSettings } from '@/db/settings';
import { allCompletedSets, listFinishedWorkouts } from '@/db/workouts';
import { attendanceDays } from '@/logic/stats';
import { nextWeeklyAt, summaryText, weekSummary } from '@/logic/summary';

const SUMMARY_ID = 'weekly-summary';
const SUNDAY = 0;
const HOUR = 19;

/**
 * (Re)schedules Sunday's summary with the data known now. Called whenever data may
 * have changed (leaving the app, a gym visit), so it is up to date when it fires.
 */
export async function scheduleWeeklySummary() {
  await Notifications.cancelScheduledNotificationAsync(SUMMARY_ID).catch(() => {});
  const { weeklySummary, weeklyGoal } = await getSettings();
  if (!weeklySummary) return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  const now = Date.now();
  const when = nextWeeklyAt(now, SUNDAY, HOUR);
  const [visits, workouts, sets] = await Promise.all([listVisits(), listFinishedWorkouts(), allCompletedSets()]);
  const summary = weekSummary(
    { workouts, sets, days: attendanceDays(visits, workouts.map((w) => w.startedAt), now), goal: weeklyGoal },
    when,
  );

  await Notifications.scheduleNotificationAsync({
    identifier: SUMMARY_ID,
    content: { title: 'Bilan de la semaine', body: summaryText(summary), data: { url: '/progress' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(when) },
  });
}
