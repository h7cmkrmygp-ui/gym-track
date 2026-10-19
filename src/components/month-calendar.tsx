import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui';
import { Gold } from '@/constants/theme';
import { selectHaptic } from '@/haptics';
import { useTheme } from '@/hooks/use-theme';
import { dayKey } from '@/logic/stats';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Monday-first month grid. Gym days are gold; today has a ring. */
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
  /** Today's day key, highlighted with a ring. */
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
        <IconButton icon="chevron.left" onPress={() => onChangeMonth(-1)} />
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
        <IconButton icon="chevron.right" onPress={() => onChangeMonth(1)} />
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <View key={`w${i}`} style={styles.weekday}>
            <ThemedText type="caps" themeColor="textSecondary">
              {w}
            </ThemedText>
          </View>
        ))}
      </View>
      <Animated.View key={title} entering={FadeIn.duration(300)} style={styles.grid}>
        {cells.map((key, i) => {
          if (!key) return <View key={`e${i}`} style={styles.cell} />;
          const isMarked = marked.has(key);
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
              <View
                style={[
                  styles.day,
                  isSelected && { borderColor: theme.accent, borderWidth: 1.5 },
                  !isSelected && isToday && { borderColor: theme.hairline, borderWidth: 1 },
                ]}>
                {isMarked && (
                  <LinearGradient colors={Gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
                )}
                <ThemedText
                  type="smallBold"
                  style={{
                    color: isMarked ? theme.onAccent : isFuture ? theme.backgroundSelected : theme.text,
                    opacity: isMarked || isToday ? 1 : 0.75,
                  }}>
                  {Number(key.slice(8))}
                </ThemedText>
              </View>
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
  title: { textTransform: 'capitalize', fontSize: 26 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 19 },
});
