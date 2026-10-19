import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LineChart } from '@/components/line-chart';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Card, Row, Screen, SectionTitle, Segmented } from '@/components/ui';
import { getExercise } from '@/db/exercises';
import { getSettings } from '@/db/settings';
import { exerciseHistory } from '@/db/workouts';
import { useFocusData } from '@/hooks/use-focus-data';
import { useTheme } from '@/hooks/use-theme';
import { isPlateau } from '@/logic/plateau';
import { computeRecords, progressSeries, type LoggedSet } from '@/logic/records';
import { formatWeight, toDisplay } from '@/logic/units';

const shortDate = (ts: number) => new Date(ts).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });

async function loadExercise(exerciseId: number) {
  const [exercise, settings, sessions] = await Promise.all([
    getExercise(exerciseId),
    getSettings(),
    exerciseHistory(exerciseId),
  ]);
  const sets: LoggedSet[] = sessions.flatMap((s) =>
    s.sets.map((set) => ({ exerciseId, workoutId: s.workoutId, at: s.startedAt, ...set })),
  );
  return {
    exercise,
    unit: settings.unit,
    sessions,
    record: computeRecords(sets).get(exerciseId),
    series: progressSeries(sets),
  };
}

/** One exercise's past: records, curve and every session, reachable mid-workout. */
export default function ExerciseScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data] = useFocusData(loadExercise, Number(id));
  const [metric, setMetric] = useState<'e1rm' | 'max'>('e1rm');

  if (!data) return <Screen>{null}</Screen>;
  const { exercise, unit, sessions, record, series } = data;

  return (
    <>
      <Stack.Screen options={{ title: exercise?.name ?? 'Exercice' }} />
      <Screen>
        {sessions.length === 0 ? (
          <Card style={styles.empty}>
            <Icon name="chart.line.uptrend.xyaxis" size={26} />
            <ThemedText type="small" themeColor="textSecondary">
              Pas encore de séance terminée avec cet exercice.
            </ThemedText>
          </Card>
        ) : (
          <>
            {record && (
              <Card>
                <Row style={styles.recordRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="caps">Charge max</ThemedText>
                    <ThemedText type="subtitle">{formatWeight(record.maxWeight.value, unit)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {shortDate(record.maxWeight.at)}
                    </ThemedText>
                  </View>
                  <View style={[styles.vDivider, { backgroundColor: theme.hairline }]} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="caps">1RM estimé</ThemedText>
                    <ThemedText type="subtitle">{formatWeight(record.bestE1rm.value, unit)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {shortDate(record.bestE1rm.at)}
                    </ThemedText>
                  </View>
                </Row>
              </Card>
            )}

            {isPlateau(series) && (
              <Card>
                <Row style={{ alignItems: 'flex-start' }}>
                  <Icon name="exclamationmark.triangle.fill" size={15} />
                  <ThemedText type="small" style={{ flex: 1 }}>
                    Pas de progrès depuis 3 séances. Un deload (−10 % pendant une séance) aide souvent à repartir :
                    l&apos;app te le proposera à ta prochaine séance.
                  </ThemedText>
                </Row>
              </Card>
            )}

            {series.length >= 2 && (
              <Card key={metric}>
                <LineChart
                  points={series.map((p) => ({
                    x: p.at,
                    y: toDisplay(metric === 'e1rm' ? p.bestE1rm : p.maxWeight, unit),
                  }))}
                  format={(y) => `${y} ${unit}`}
                />
                <Segmented
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: 'e1rm', label: '1RM estimé' },
                    { value: 'max', label: 'Charge max' },
                  ]}
                />
              </Card>
            )}

            <SectionTitle>Dernières séances</SectionTitle>
            {sessions.slice(0, 20).map((s, i) => (
              <Card key={s.workoutId}>
                <Row style={styles.between}>
                  <ThemedText type="smallBold">{s.workoutName}</ThemedText>
                  <ThemedText type="caps" themeColor="textSecondary">
                    {shortDate(s.startedAt)}
                  </ThemedText>
                </Row>
                <View style={styles.sets}>
                  {s.sets.map((set, j) => (
                    <View key={j} style={[styles.setPill, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText type="small" style={{ fontVariant: ['tabular-nums'] }}>
                        {toDisplay(set.weightKg, unit)} × {set.reps}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: 'space-between' },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  recordRow: { gap: 16 },
  vDivider: { width: 1, alignSelf: 'stretch' },
  sets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  setPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
