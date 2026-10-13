import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { LineChart } from '@/components/line-chart';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Input, Row, Screen, SectionTitle, Segmented } from '@/components/ui';
import { deleteBodyweight, listBodyweight, logBodyweight } from '@/db/bodyweight';
import { listTrainedExercises } from '@/db/exercises';
import { getSettings } from '@/db/settings';
import { allCompletedSets } from '@/db/workouts';
import { useFocusData } from '@/hooks/use-focus-data';
import { useTheme } from '@/hooks/use-theme';
import { computeRecords, progressSeries } from '@/logic/records';
import { dayKey } from '@/logic/stats';
import { formatWeight, fromDisplay, toDisplay } from '@/logic/units';

type Tab = 'exercises' | 'records' | 'bodyweight';
type Metric = 'e1rm' | 'max';

const shortDate = (ts: number) => new Date(ts).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });

async function loadProgress() {
  const [settings, exercises, sets, bodyweight] = await Promise.all([
    getSettings(),
    listTrainedExercises(),
    allCompletedSets(),
    listBodyweight(),
  ]);
  return { unit: settings.unit, exercises, sets, records: computeRecords(sets), bodyweight };
}

export default function ProgressScreen() {
  const [data, reload] = useFocusData(loadProgress);
  const [tab, setTab] = useState<Tab>('exercises');

  return (
    <Screen title="Progrès">
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'exercises', label: 'Exercices' },
          { value: 'records', label: 'Records' },
          { value: 'bodyweight', label: 'Poids' },
        ]}
      />
      {data && tab === 'exercises' && <ExercisesTab data={data} />}
      {data && tab === 'records' && <RecordsTab data={data} />}
      {data && tab === 'bodyweight' && <BodyweightTab data={data} onChange={reload} />}
    </Screen>
  );
}

type Data = Awaited<ReturnType<typeof loadProgress>>;

function ExercisesTab({ data }: { data: Data }) {
  const theme = useTheme();
  const [exerciseId, setExerciseId] = useState<number | null>(null);
  const [metric, setMetric] = useState<Metric>('e1rm');

  if (data.exercises.length === 0) {
    return <ThemedText themeColor="textSecondary">Termine une séance pour voir ta progression ici.</ThemedText>;
  }

  const selected = data.exercises.find((e) => e.id === exerciseId) ?? data.exercises[0];
  const series = progressSeries(data.sets.filter((s) => s.exerciseId === selected.id));
  const points = series.map((p) => ({
    x: p.at,
    y: toDisplay(metric === 'e1rm' ? p.bestE1rm : p.maxWeight, data.unit),
  }));

  return (
    <>
      <View style={styles.chips}>
        {data.exercises.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => setExerciseId(e.id)}
            style={[styles.chip, { backgroundColor: e.id === selected.id ? theme.accent : theme.backgroundElement }]}>
            <ThemedText type="small" style={e.id === selected.id ? { color: theme.onAccent } : undefined}>
              {e.name}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      <Card>
        <ThemedText style={{ fontWeight: 700 }}>{selected.name}</ThemedText>
        <Segmented
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'e1rm', label: '1RM estimé' },
            { value: 'max', label: 'Charge max' },
          ]}
        />
        {points.length < 2 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Il faut au moins 2 séances avec cet exercice pour tracer une courbe.
          </ThemedText>
        ) : (
          <LineChart points={points} format={(y) => `${y} ${data.unit}`} />
        )}
      </Card>
      <SectionTitle>Séances</SectionTitle>
      {[...series].reverse().map((p) => (
        <Row key={p.workoutId} style={styles.listRow}>
          <ThemedText type="small">{shortDate(p.at)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            max {formatWeight(p.maxWeight, data.unit)} · 1RM est. {formatWeight(p.bestE1rm, data.unit)}
          </ThemedText>
        </Row>
      ))}
    </>
  );
}

function RecordsTab({ data }: { data: Data }) {
  if (data.records.size === 0) {
    return <ThemedText themeColor="textSecondary">Tes records apparaîtront après ta première séance.</ThemedText>;
  }
  return (
    <>
      {data.exercises
        .filter((e) => data.records.has(e.id))
        .map((e) => {
          const r = data.records.get(e.id)!;
          return (
            <Card key={e.id}>
              <ThemedText style={{ fontWeight: 700 }}>{e.name}</ThemedText>
              <Row style={styles.listRow}>
                <ThemedText type="small">🏋️ Charge max</ThemedText>
                <ThemedText type="small">
                  {formatWeight(r.maxWeight.value, data.unit)} · {shortDate(r.maxWeight.at)}
                </ThemedText>
              </Row>
              <Row style={styles.listRow}>
                <ThemedText type="small">📈 1RM estimé</ThemedText>
                <ThemedText type="small">
                  {formatWeight(r.bestE1rm.value, data.unit)} · {shortDate(r.bestE1rm.at)}
                </ThemedText>
              </Row>
            </Card>
          );
        })}
    </>
  );
}

function BodyweightTab({ data, onChange }: { data: Data; onChange: () => void }) {
  const [value, setValue] = useState('');

  const log = async () => {
    const n = Number(value.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    await logBodyweight(dayKey(Date.now()), fromDisplay(n, data.unit));
    setValue('');
    onChange();
  };

  const remove = (id: number, date: string) =>
    Alert.alert(`Supprimer la pesée du ${date} ?`, undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteBodyweight(id);
          onChange();
        },
      },
    ]);

  // Dates are local days; noon avoids any timezone edge when turning them into timestamps.
  const points = data.bodyweight.map((b) => ({
    x: new Date(`${b.date}T12:00:00`).getTime(),
    y: toDisplay(b.weightKg, data.unit),
  }));

  return (
    <>
      <Card>
        <ThemedText>Poids du jour</ThemedText>
        <Row>
          <Input
            style={{ flex: 1 }}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder={`ex. 180 ${data.unit}`}
          />
          <Button label="Enregistrer" onPress={log} />
        </Row>
      </Card>
      {points.length >= 2 && (
        <Card>
          <LineChart points={points} format={(y) => `${y} ${data.unit}`} />
        </Card>
      )}
      {[...data.bodyweight].reverse().map((b) => (
        <Pressable key={b.id} onLongPress={() => remove(b.id, b.date)}>
          <Row style={styles.listRow}>
            <ThemedText type="small">{b.date}</ThemedText>
            <ThemedText type="small">{formatWeight(b.weightKg, data.unit)}</ThemedText>
          </Row>
        </Pressable>
      ))}
      {data.bodyweight.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Appui long sur une pesée pour la supprimer.
        </ThemedText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  listRow: { justifyContent: 'space-between' },
});
