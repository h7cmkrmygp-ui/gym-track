import * as Notifications from 'expo-notifications';

import { listVisits } from '@/db/gyms';
import { getSettings } from '@/db/settings';
import { listTemplates } from '@/db/templates';
import { allCompletedSets, lastRotationTemplateId, listFinishedWorkouts } from '@/db/workouts';
import { daysSince, inactivityReminderAt } from '@/logic/reminder';
import { nextInRotation } from '@/logic/rotation';
import { attendanceDays } from '@/logic/stats';
import { nextWeeklyAt, summaryText, weekSummary } from '@/logic/summary';

const SUMMARY_ID = 'weekly-summary';
const INACTIVITY_ID = 'inactivity-reminder';
const SUNDAY = 0;
const SUMMARY_HOUR = 19;
const REMINDER_HOUR = 18;

/**
 * (Re)schedules the timed notifications (Sunday's summary, the inactivity nudge) from
 * the data known now. Called whenever data may have changed (leaving the app, a gym
 * visit), so their content is up to date when they fire.
 */
export async function scheduleTimedNotifications() {
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(SUMMARY_ID).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(INACTIVITY_ID).catch(() => {}),
  ]);
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  const settings = await getSettings();
  const now = Date.now();
  const [visits, workouts, sets, templates, lastId] = await Promise.all([
    listVisits(),
    listFinishedWorkouts(),
    allCompletedSets(),
    listTemplates(),
    lastRotationTemplateId(),
  ]);
  const days = attendanceDays(visits, workouts.map((w) => w.startedAt), now);

  if (settings.weeklySummary) {
    const when = nextWeeklyAt(now, SUNDAY, SUMMARY_HOUR);
    const summary = weekSummary({ workouts, sets, days, goal: settings.weeklyGoal }, when);
    await Notifications.scheduleNotificationAsync({
      identifier: SUMMARY_ID,
      content: { title: 'Bilan de la semaine', body: summaryText(summary), data: { url: '/progress' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(when) },
    });
  }

  const lastDay = [...days].sort().pop() ?? null;
  const remindAt = inactivityReminderAt(lastDay, now, settings.inactivityDays, REMINDER_HOUR);
  if (lastDay && remindAt) {
    const next = nextInRotation(templates, lastId);
    await Notifications.scheduleNotificationAsync({
      identifier: INACTIVITY_ID,
      content: {
        title: `Ça fait ${daysSince(lastDay, remindAt)} jours sans gym 😴`,
        body: next ? `Prochaine séance : ${next.name}. On y retourne ?` : 'On y retourne ?',
        data: { url: '/' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(remindAt) },
    });
  }
}
