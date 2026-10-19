import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Gold } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Gold ring filled to `progress` (0 to 1), animated on every change. With `countdown`
 * it instead empties linearly until `endsAt` (the rest timer), driven on the UI thread.
 */
export function ProgressRing({
  progress = 0,
  countdown,
  size = 120,
  stroke = 10,
  children,
}: {
  progress?: number;
  countdown?: { endsAt: number; totalMs: number };
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = useSharedValue(0);
  const endsAt = countdown?.endsAt;
  const totalMs = countdown?.totalMs;

  useEffect(() => {
    if (endsAt !== undefined && totalMs) {
      const remaining = Math.max(0, endsAt - Date.now());
      value.set(Math.min(1, remaining / totalMs));
      value.set(withTiming(0, { duration: remaining, easing: Easing.linear }));
      return;
    }
    const target = Math.max(0, Math.min(1, progress));
    value.set(withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [progress, endsAt, totalMs, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={Gold[0]} />
            <Stop offset="0.5" stopColor={Gold[1]} />
            <Stop offset="1" stopColor={Gold[2]} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.backgroundSelected}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          // Start at 12 o'clock and go clockwise.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children && <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
