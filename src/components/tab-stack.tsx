import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { liquidGlass } from '@/env';

/**
 * Navigation stack of a tab: a native iOS large title that shrinks into the bar as the
 * page scrolls. On iOS 26 the bar is left to the system (Liquid Glass buttons, content
 * fading under the edge); before, it gets a blur.
 */
export function TabStack({ title }: { title: string }) {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: true,
        headerBlurEffect: liquidGlass ? undefined : 'systemChromeMaterialDark',
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
