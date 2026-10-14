import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { LineChart } from '@/components/line-chart';
import { ThemedText } from '@/components/themed-text';
import { Card, Row, Screen, SectionTitle, Segmented } from '@/components/ui';
import { getExercise } from '@/db/exercises';
import { getSettings } from '@/db/settings';
import { exerciseHistory } from '@/db/workouts';
import { useFocusData } from '@/hooks/use-focus-data';
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
          <ThemedText themeColor="textSecondary">Pas encore de séance terminée avec cet exercice.</ThemedText>
        ) : (
          <>
            {record && (
              <Card>
                <Row style={styles.between}>
                  <ThemedText type="small">🏋️ Charge max</ThemedText>
                  <ThemedText type="smallBold">
                    {formatWeight(record.maxWeight.value, unit)} · {shortDate(record.maxWeight.at)}
                  </ThemedText>
                </Row>
                <Row style={styles.between}>
                  <ThemedText type="small">📈 1RM estimé</ThemedText>
                  <ThemedText type="smallBold">
                    {formatWeight(record.bestE1rm.value, unit)} · {shortDate(record.bestE1rm.at)}
                  </ThemedText>
                </Row>
              </Card>
            )}

            {series.length >= 2 && (
              <Card>
                <Segmented
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: 'e1rm', label: '1RM estimé' },
                    { value: 'max', label: 'Charge max' },
                  ]}
                />
                <LineChart
                  points={series.map((p) => ({
                    x: p.at,
                    y: toDisplay(metric === 'e1rm' ? p.bestE1rm : p.maxWeight, unit),
                  }))}
                  format={(y) => `${y} ${unit}`}
                />
              </Card>
            )}

            <SectionTitle>Dernières séances</SectionTitle>
            {sessions.slice(0, 20).map((s) => (
              <Card key={s.workoutId}>
                <Row style={styles.between}>
                  <ThemedText type="smallBold">{s.workoutName}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {shortDate(s.startedAt)}
                  </ThemedText>
                </Row>
                <ThemedText>
                  {s.sets.map((set) => `${toDisplay(set.weightKg, unit)}×${set.reps}`).join('   ')}
                </ThemedText>
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
});
