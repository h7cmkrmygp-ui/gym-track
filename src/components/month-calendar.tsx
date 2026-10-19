import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui';
import { RingColors } from '@/constants/theme';
import { selectHaptic } from '@/haptics';
import { useTheme } from '@/hooks/use-theme';
import { dayKey } from '@/logic/stats';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const RING = 26;
const RING_STROKE = 4;

/** A day's small ring, as in Fitness's history: closed on gym days, a dim track otherwise. */
function DayRing({ closed }: { closed: boolean }) {
  const r = (RING - RING_STROKE) / 2;
  return (
    <Svg width={RING} height={RING}>
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        stroke={RingColors.days}
        strokeOpacity={closed ? 1 : 0.22}
        strokeWidth={RING_STROKE}
        fill="none"
      />
    </Svg>
  );
}

/** Monday-first month grid with a ring per day. */
export function MonthCalendar({
  month,
  today,
  marked,
  selected,
  onSelect,
  onChangeMonth,
}: {
  /** Any timestamp inside the month to show. */
  month: number;
  /** Today's day key. */
  today: string;
  marked: Set<string>;
  selected: string | null;
  onSelect: (day: string) => void;
  onChangeMonth: (delta: -1 | 1) => void;
}) {
  const theme = useTheme();
  const first = new Date(month);
  first.setDate(1);
  first.setHours(12, 0, 0, 0);
  const leading = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();

  const cells: (string | null)[] = Array(leading).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(dayKey(new Date(first.getFullYear(), first.getMonth(), d, 12).getTime()));
  }
  while (cells.length % 7) cells.push(null);

  const title = first.toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
        <View style={styles.arrows}>
          <IconButton icon="chevron.left" onPress={() => onChangeMonth(-1)} />
          <IconButton icon="chevron.right" onPress={() => onChangeMonth(1)} />
        </View>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <View key={`w${i}`} style={styles.weekday}>
            <ThemedText type="caps">{w}</ThemedText>
          </View>
        ))}
      </View>
      <Animated.View key={title} entering={FadeIn.duration(250)} style={styles.grid}>
        {cells.map((key, i) => {
          if (!key) return <View key={`e${i}`} style={styles.cell} />;
          const isSelected = key === selected;
          const isToday = key === today;
          const isFuture = key > today;
          return (
            <Pressable
              key={key}
              style={styles.cell}
              onPress={() => {
                selectHaptic();
                onSelect(key);
              }}>
              <View style={[styles.number, isSelected && { backgroundColor: theme.accent }]}>
                <ThemedText
                  type="caps"
                  style={{
                    color: isSelected ? theme.onAccent : isToday ? theme.accent : isFuture ? theme.backgroundSelected : theme.text,
                    textTransform: 'none',
                  }}>
                  {Number(key.slice(8))}
                </ThemedText>
              </View>
              {!isFuture && <DayRing closed={marked.has(key)} />}
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { textTransform: 'capitalize' },
  arrows: { flexDirection: 'row', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
  cell: { width: `${100 / 7}%`, height: 54, alignItems: 'center', justifyContent: 'flex-start', gap: 2, paddingTop: 2 },
  number: { minWidth: 22, height: 20, borderRadius: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
});
