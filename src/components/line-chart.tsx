import { useEffect, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { selectHaptic } from '@/haptics';
import { useTheme } from '@/hooks/use-theme';

export type ChartPoint = { x: number; y: number };

const AnimatedPath = Animated.createAnimatedComponent(Path);
const PAD_X = 8;
const PAD_Y = 14;
const shortDate = (ts: number) => new Date(ts).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });

/** Smooth curve through the points (Catmull-Rom turned into cubic Béziers). */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Time-series line chart: x is a timestamp, y a value already in display units.
 * The line draws itself in; touching the chart scrubs through the points.
 */
export function LineChart({
  points,
  format,
  height = 170,
}: {
  points: ChartPoint[];
  format: (y: number) => string;
  height?: number;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const progress = useSharedValue(0);

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)];
  let [yMin, yMax] = [Math.min(...ys), Math.max(...ys)];
  if (yMin === yMax) [yMin, yMax] = [yMin - 1, yMax + 1];

  const sx = (x: number) => (xMax === xMin ? width / 2 : PAD_X + ((x - xMin) / (xMax - xMin)) * (width - 2 * PAD_X));
  const sy = (y: number) => PAD_Y + (1 - (y - yMin) / (yMax - yMin)) * (height - 2 * PAD_Y);
  const pixels = points.map((p) => ({ x: sx(p.x), y: sy(p.y) }));
  const line = width > 0 && pixels.length > 0 ? smoothPath(pixels) : '';
  const area = line ? `${line} L${pixels[pixels.length - 1].x.toFixed(1)},${height} L${pixels[0].x.toFixed(1)},${height} Z` : '';
  // Dash long enough for the curve, so animating its offset draws the line.
  const length = pixels.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - pixels[i - 1].x, p.y - pixels[i - 1].y) : 0), 0) * 1.2 + 1;

  useEffect(() => {
    if (!line) return;
    progress.set(0);
    progress.set(withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [line, progress]);

  const animatedLine = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));

  if (points.length === 0) return null;
  const shown = selected ?? points.length - 1;

  const scrub = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    let nearest = 0;
    pixels.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(pixels[nearest].x - x)) nearest = i;
    });
    if (nearest !== selected) {
      selectHaptic();
      setSelected(nearest);
    }
  };

  return (
    <View>
      <View style={styles.header}>
        <ThemedText type="subtitle">{format(points[shown].y)}</ThemedText>
        <ThemedText type="caps" themeColor="textSecondary">
          {shortDate(points[shown].x)}
        </ThemedText>
      </View>
      <View
        style={{ height }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={scrub}
        onResponderMove={scrub}
        // Let the page scroll when the finger moves vertically.
        onResponderTerminationRequest={() => true}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.accent} stopOpacity={0.28} />
                <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line
                key={f}
                x1={0}
                x2={width}
                y1={PAD_Y + f * (height - 2 * PAD_Y)}
                y2={PAD_Y + f * (height - 2 * PAD_Y)}
                stroke={theme.hairline}
                strokeDasharray="3 5"
                strokeWidth={1}
              />
            ))}
            <Path d={area} fill="url(#area)" />
            <AnimatedPath
              d={line}
              stroke={theme.accent}
              strokeWidth={2}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={`${length} ${length}`}
              animatedProps={animatedLine}
            />
            <Line
              x1={pixels[shown].x}
              x2={pixels[shown].x}
              y1={0}
              y2={height}
              stroke={theme.accent}
              strokeOpacity={0.25}
              strokeWidth={1}
            />
            {pixels.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={i === shown ? 5 : 3} fill={i === shown ? theme.accent : theme.chart} />
            ))}
            <Circle cx={pixels[shown].x} cy={pixels[shown].y} r={10} fill={theme.accent} fillOpacity={0.18} />
          </Svg>
        )}
      </View>
      <Animated.View entering={FadeIn.delay(400)} style={styles.labels}>
        <ThemedText type="caps" themeColor="textSecondary">
          {shortDate(xMin)}
        </ThemedText>
        <ThemedText type="caps" themeColor="textSecondary">
          min {format(Math.min(...ys))} · max {format(Math.max(...ys))}
        </ThemedText>
        <ThemedText type="caps" themeColor="textSecondary">
          {shortDate(xMax)}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2, marginBottom: 6 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
});
