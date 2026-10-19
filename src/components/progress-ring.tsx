import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** One ring drawn inside an existing <Svg>, centered on `center`. */
function RingArc({
  center,
  radius,
  stroke,
  color,
  progress = 0,
  countdown,
}: {
  center: number;
  radius: number;
  stroke: number;
  color: string;
  progress?: number;
  countdown?: { endsAt: number; totalMs: number };
}) {
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
    value.set(withTiming(target, { duration: 1000, easing: Easing.out(Easing.cubic) }));
  }, [progress, endsAt, totalMs, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
  }));

  return (
    <>
      {/* The track: the same colour, dimmed, as in Fitness. */}
      <Circle cx={center} cy={center} r={radius} stroke={color} strokeOpacity={0.22} strokeWidth={stroke} fill="none" />
      <AnimatedCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={animatedProps}
        // Start at 12 o'clock and go clockwise.
        transform={`rotate(-90 ${center} ${center})`}
      />
    </>
  );
}

/**
 * Ring filled to `progress` (0 to 1), animated on every change. With `countdown` it
 * instead empties linearly until `endsAt` (the rest timer), driven on the UI thread.
 */
export function ProgressRing({
  progress = 0,
  countdown,
  color,
  size = 120,
  stroke = 12,
  children,
}: {
  progress?: number;
  countdown?: { endsAt: number; totalMs: number };
  color?: string;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <RingArc
          center={size / 2}
          radius={(size - stroke) / 2}
          stroke={stroke}
          color={color ?? theme.accent}
          progress={progress}
          countdown={countdown}
        />
      </Svg>
      {children && <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>}
    </View>
  );
}

/** Concentric rings, outermost first, like Fitness's Move / Exercise / Stand. */
export function ActivityRings({
  rings,
  size = 150,
  stroke = 18,
}: {
  rings: { progress: number; color: string }[];
  size?: number;
  stroke?: number;
}) {
  const gap = 2;
  return (
    <Svg width={size} height={size}>
      {rings.map((ring, i) => (
        <RingArc
          key={i}
          center={size / 2}
          radius={(size - stroke) / 2 - i * (stroke + gap)}
          stroke={stroke}
          color={ring.color}
          progress={ring.progress}
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
