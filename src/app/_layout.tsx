// Must stay the first import: defines the geofence task in the global scope.
import '@/geofence/task';

import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { getDb } from '@/db/client';
import { syncGeofences } from '@/geofence/regions';
import { refreshWidget } from '@/widget';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    getDb()
      .then(() => Promise.all([syncGeofences(), refreshWidget()]))
      .catch((e) => console.error(e));
    const notificationSub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.url === '/') router.navigate('/');
    });
    // Whatever changed in the app (workout, check-in, split) reaches the widget when leaving it.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'background') refreshWidget();
    });
    return () => {
      notificationSub.remove();
      appStateSub.remove();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerBackTitle: 'Retour' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'Séance' }} />
        <Stack.Screen name="template/[id]" options={{ title: 'Modèle de séance' }} />
        <Stack.Screen name="gym/[id]" options={{ title: 'Salle' }} />
      </Stack>
    </ThemeProvider>
  );
}
