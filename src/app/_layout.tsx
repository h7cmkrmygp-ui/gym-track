// Must stay the first import: defines the geofence task in the global scope.
import '@/geofence/task';

import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { getDb } from '@/db/client';
import { syncGeofences } from '@/geofence/regions';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    getDb()
      .then(syncGeofences)
      .catch((e) => console.error(e));
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.url === '/') router.navigate('/');
    });
    return () => sub.remove();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerBackTitle: 'Retour' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'Séance' }} />
        <Stack.Screen name="template/[id]" options={{ title: 'Modèle de séance' }} />
      </Stack>
    </ThemeProvider>
  );
}
