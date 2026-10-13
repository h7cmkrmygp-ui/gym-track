import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { dayKey } from '@/logic/stats';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Monday-first month grid. Days in `marked` get a filled circle. */
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
        <Pressable hitSlop={12} onPress={() => onChangeMonth(-1)}>
          <ThemedText type="subtitle" style={styles.arrow}>‹</ThemedText>
        </Pressable>
        <ThemedText type="default" style={styles.title}>
          {title}
        </ThemedText>
        <Pressable hitSlop={12} onPress={() => onChangeMonth(1)}>
          <ThemedText type="subtitle" style={styles.arrow}>›</ThemedText>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <View key={`w${i}`} style={styles.cell}>
            <ThemedText type="small" themeColor="textSecondary">
              {w}
            </ThemedText>
          </View>
        ))}
        {cells.map((key, i) => {
          if (!key) return <View key={`e${i}`} style={styles.cell} />;
          const isMarked = marked.has(key);
          const isSelected = key === selected;
          return (
            <Pressable key={key} style={styles.cell} onPress={() => onSelect(key)}>
              <View
                style={[
                  styles.day,
                  isMarked && { backgroundColor: theme.accent },
                  isSelected && { borderColor: theme.text, borderWidth: 2 },
                  !isMarked && key === today && { borderColor: theme.accent, borderWidth: 1 },
                ]}>
                <ThemedText type="smallBold" style={isMarked ? { color: theme.onAccent } : undefined}>
                  {Number(key.slice(8))}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { textTransform: 'capitalize', fontWeight: 700 },
  arrow: { lineHeight: 34, paddingHorizontal: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
