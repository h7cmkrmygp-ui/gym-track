import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

/**
 * Navigation stack of a tab: a native iOS large title that shrinks into the bar as the
 * page scrolls, on a translucent bar, as in Apple's own apps.
 */
export function TabStack({ title }: { title: string }) {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: true,
        headerBlurEffect: 'systemChromeMaterialDark',
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: 'transparent' },
        headerTitleStyle: { color: Colors.dark.text },
        headerLargeTitleStyle: { color: Colors.dark.text },
        headerTintColor: Colors.dark.accent,
        contentStyle: { backgroundColor: Colors.dark.background },
      }}>
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
