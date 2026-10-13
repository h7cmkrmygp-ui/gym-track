import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type ChartPoint = { x: number; y: number };

const PAD = 10;
const shortDate = (ts: number) => new Date(ts).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });

/** Minimal time-series line chart: x is a timestamp, y a value already in display units. */
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

  if (points.length === 0) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [xMin, xMax] = [Math.min(...xs), Math.max(...xs)];
  let [yMin, yMax] = [Math.min(...ys), Math.max(...ys)];
  if (yMin === yMax) [yMin, yMax] = [yMin - 1, yMax + 1];

  const sx = (x: number) => (xMax === xMin ? width / 2 : PAD + ((x - xMin) / (xMax - xMin)) * (width - 2 * PAD));
  const sy = (y: number) => PAD + (1 - (y - yMin) / (yMax - yMin)) * (height - 2 * PAD);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');

  return (
    <View>
      <View style={styles.labels}>
        <ThemedText type="small" themeColor="textSecondary">
          max {format(Math.max(...ys))}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          min {format(Math.min(...ys))}
        </ThemedText>
      </View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line
                key={f}
                x1={0}
                x2={width}
                y1={PAD + f * (height - 2 * PAD)}
                y2={PAD + f * (height - 2 * PAD)}
                stroke={theme.backgroundSelected}
                strokeWidth={1}
              />
            ))}
            <Path d={path} stroke={theme.accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
            {points.map((p, i) => (
              <Circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill={theme.accent} />
            ))}
          </Svg>
        )}
      </View>
      <View style={styles.labels}>
        <ThemedText type="small" themeColor="textSecondary">
          {shortDate(xMin)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {shortDate(xMax)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
});
