// Must stay the first import: defines the geofence task in the global scope.
import '@/geofence/task';

import * as Notifications from 'expo-notifications';
import { DarkTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { snapshotIfDue } from '@/backup';
import { Colors } from '@/constants/theme';
import { getDb } from '@/db/client';
import { getSettings, setSetting } from '@/db/settings';
import { getActiveWorkout } from '@/db/workouts';
import { syncGeofences } from '@/geofence/regions';
import { endRestActivity } from '@/live-activity';
import { handleNotificationResponse } from '@/notifications/responses';
import { scheduleTimedNotifications } from '@/notifications/summary';
import { refreshWidget } from '@/widget';

// The app is always dark (app.json); headers and backgrounds use the logo's colors.
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.accent,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.backgroundSelected,
  },
};

export { ErrorScreen as ErrorBoundary } from '@/components/error-screen';

/** A launch counts as successful once the app has stayed open this long. */
const LAUNCH_OK_AFTER_MS = 10_000;

// The splash fades into the app instead of cutting.
SplashScreen.setOptions({ fade: true, duration: 400 });

export default function RootLayout() {
  useEffect(() => {
    getDb()
      .then(async () => {
        // The app may have been launched by tapping a notification…
        const launch = await Notifications.getLastNotificationResponseAsync();
        if (launch) {
          await handleNotificationResponse(launch);
          await Notifications.clearLastNotificationResponseAsync();
        } else {
          // …otherwise reopening it goes straight back to an unfinished workout, unless the
          // previous launch crashed early: then it stays on the home screen to avoid a crash loop.
          const { launchPending } = await getSettings();
          const active = await getActiveWorkout();
          if (active && !launchPending) router.push(`/workout/${active.id}`);
        }
        await setSetting('launchPending', true);
        setTimeout(() => setSetting('launchPending', false).catch(() => {}), LAUNCH_OK_AFTER_MS);
        // A rest timer does not survive a relaunch; neither should its Live Activity.
        await endRestActivity();
        await Promise.all([syncGeofences(), refreshWidget(), scheduleTimedNotifications()]);
        await snapshotIfDue().catch((e) => console.warn('Automatic backup failed', e));
      })
      .catch((e) => console.error(e));
    const notificationSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response).catch((e) => console.error(e));
    });
    // Whatever changed in the app (workout, check-in, split) reaches the widget and
    // Sunday's summary when leaving it.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'background') return;
      refreshWidget();
      scheduleTimedNotifications().catch((e) => console.warn('Scheduling notifications failed', e));
    });
    return () => {
      notificationSub.remove();
      appStateSub.remove();
    };
  }, []);

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerBackTitle: 'Retour',
          headerTintColor: Colors.dark.accent,
          // Translucent bar over the content, as in Apple's apps.
          headerTransparent: true,
          headerBlurEffect: 'systemChromeMaterialDark',
          headerShadowVisible: false,
          headerTitleStyle: { color: Colors.dark.text },
          contentStyle: { backgroundColor: Colors.dark.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'Séance' }} />
        <Stack.Screen name="template/[id]" options={{ title: 'Modèle de séance' }} />
        {/* The map screen lays itself out from the top, so it keeps an opaque bar. */}
        <Stack.Screen
          name="gym/[id]"
          options={{ title: 'Salle', headerTransparent: false, headerStyle: { backgroundColor: Colors.dark.background } }}
        />
        <Stack.Screen name="exercise/[id]" options={{ title: 'Exercice' }} />
      </Stack>
    </ThemeProvider>
  );
}
