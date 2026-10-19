import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { LineChart } from '@/components/line-chart';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, IconButton, Input, Row, Screen, SectionTitle, Segmented } from '@/components/ui';
import { MUSCLE_GROUPS } from '@/data/exercises.fr';
import { deleteBodyweight, listBodyweight, logBodyweight } from '@/db/bodyweight';
import { listTrainedExercises } from '@/db/exercises';
import { getSettings } from '@/db/settings';
import { allCompletedSets, completedSetsWithMuscle } from '@/db/workouts';
import { successHaptic } from '@/haptics';
import { useFocusData } from '@/hooks/use-focus-data';
import { useTheme } from '@/hooks/use-theme';
import { computeRecords, progressSeries } from '@/logic/records';
import { dayKey, weekStart } from '@/logic/stats';
import { formatWeight, fromDisplay, toDisplay } from '@/logic/units';
import { setsPerMuscle } from '@/logic/volume';

type Tab = 'exercises' | 'muscles' | 'records' | 'bodyweight';
type Metric = 'e1rm' | 'max';

const shortDate = (ts: number) => new Date(ts).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });

async function loadProgress() {
  const [settings, exercises, sets, bodyweight, muscleSets] = await Promise.all([
    getSettings(),
    listTrainedExercises(),
    allCompletedSets(),
    listBodyweight(),
    completedSetsWithMuscle(),
  ]);
  return {
    unit: settings.unit,
    exercises,
    sets,
    records: computeRecords(sets),
    bodyweight,
    muscleSets,
    thisWeek: weekStart(Date.now()).getTime(),
  };
}

export default function ProgressScreen() {
  const [data, reload] = useFocusData(loadProgress);
  const [tab, setTab] = useState<Tab>('exercises');

  return (
    <Screen>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'exercises', label: 'Exercices' },
          { value: 'muscles', label: 'Muscles' },
          { value: 'records', label: 'Records' },
          { value: 'bodyweight', label: 'Poids' },
        ]}
      />
      {data && tab === 'exercises' && <ExercisesTab data={data} />}
      {data && tab === 'muscles' && <MusclesTab data={data} />}
      {data && tab === 'records' && <RecordsTab data={data} />}
      {data && tab === 'bodyweight' && <BodyweightTab data={data} onChange={reload} />}
    </Screen>
  );
}

type Data = Awaited<ReturnType<typeof loadProgress>>;

function Empty({ icon, text }: { icon: Parameters<typeof Icon>[0]['name']; text: string }) {
  return (
    <Card style={styles.empty}>
      <Icon name={icon} size={28} />
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        {text}
      </ThemedText>
    </Card>
  );
}

function ExercisesTab({ data }: { data: Data }) {
  const theme = useTheme();
  const [exerciseId, setExerciseId] = useState<number | null>(null);
  const [metric, setMetric] = useState<Metric>('e1rm');

  if (data.exercises.length === 0) {
    return <Empty icon="chart.line.uptrend.xyaxis" text="Termine une séance pour voir ta progression ici." />;
  }

  const selected = data.exercises.find((e) => e.id === exerciseId) ?? data.exercises[0];
  const series = progressSeries(data.sets.filter((s) => s.exerciseId === selected.id));
  const points = series.map((p) => ({
    x: p.at,
    y: toDisplay(metric === 'e1rm' ? p.bestE1rm : p.maxWeight, data.unit),
  }));

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {data.exercises.map((e) => (
          <Chip key={e.id} label={e.name} selected={e.id === selected.id} onPress={() => setExerciseId(e.id)} />
        ))}
      </ScrollView>
      <Card key={`${selected.id}-${metric}`}>
        <Row style={styles.between}>
          <ThemedText type="caps">{metric === 'e1rm' ? '1RM estimé' : 'Charge max'}</ThemedText>
          <Pressable onPress={() => router.push(`/exercise/${selected.id}`)} hitSlop={8}>
            <Row style={{ gap: 4 }}>
              <ThemedText type="caps" themeColor="textSecondary">
                Historique
              </ThemedText>
              <Icon name="chevron.right" size={9} color={theme.textSecondary} />
            </Row>
          </Pressable>
        </Row>
        <ThemedText type="default" style={{ fontWeight: 700 }}>
          {selected.name}
        </ThemedText>
        {points.length < 2 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Il faut au moins 2 séances avec cet exercice pour tracer une courbe.
          </ThemedText>
        ) : (
          <LineChart points={points} format={(y) => `${y} ${data.unit}`} />
        )}
        <Segmented
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'e1rm', label: '1RM estimé' },
            { value: 'max', label: 'Charge max' },
          ]}
        />
      </Card>
      <SectionTitle>Séances</SectionTitle>
      <Card style={{ gap: 0 }}>
        {[...series].reverse().map((p, i) => (
          <Row
            key={p.workoutId}
            style={[styles.listRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.hairline }]}>
            <ThemedText type="small">{shortDate(p.at)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              max {formatWeight(p.maxWeight, data.unit)} · 1RM {formatWeight(p.bestE1rm, data.unit)}
            </ThemedText>
          </Row>
        ))}
      </Card>
    </>
  );
}

/** Common hypertrophy guideline, shown as a shaded zone behind the bars. */
const TARGET_MIN = 10;
const TARGET_MAX = 20;

/** One muscle's bar, growing from the left when shown. */
function MuscleBar({ ratio, zone, delay }: { ratio: number; zone: [number, number]; delay: number }) {
  const theme = useTheme();
  const [track, setTrack] = useState(0);
  const width = useSharedValue(0);

  useEffect(() => {
    width.set(withDelay(delay, withTiming(track * ratio, { duration: 700, easing: Easing.out(Easing.cubic) })));
  }, [track, ratio, delay, width]);

  const bar = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <View style={styles.barTrack} onLayout={(e) => setTrack(e.nativeEvent.layout.width)}>
      <View
        style={[
          styles.targetZone,
          { left: `${zone[0] * 100}%`, width: `${(zone[1] - zone[0]) * 100}%`, backgroundColor: theme.backgroundSelected },
        ]}
      />
      {ratio > 0 && (
        <Animated.View style={[styles.bar, { backgroundColor: theme.chart }, bar]} />
      )}
    </View>
  );
}

function MusclesTab({ data }: { data: Data }) {
  const { thisWeek } = data;
  const [week, setWeek] = useState(thisWeek);
  const rows = setsPerMuscle(data.muscleSets, MUSCLE_GROUPS, week);
  const scale = Math.max(TARGET_MAX + 4, ...rows.map((r) => r.sets));
  const total = rows.reduce((n, r) => n + r.sets, 0);

  const changeWeek = (delta: -1 | 1) => {
    const d = new Date(week);
    d.setDate(d.getDate() + 7 * delta);
    setWeek(weekStart(d.getTime()).getTime());
  };

  return (
    <Card key={week}>
      <Row style={styles.between}>
        <IconButton icon="chevron.left" onPress={() => changeWeek(-1)} />
        <View style={{ alignItems: 'center' }}>
          <ThemedText type="caps">{week === thisWeek ? 'Cette semaine' : `Semaine du ${shortDate(week)}`}</ThemedText>
          <ThemedText type="subtitle">
            {total} {total > 1 ? 'séries' : 'série'}
          </ThemedText>
        </View>
        <IconButton icon="chevron.right" disabled={week >= thisWeek} onPress={() => changeWeek(1)} />
      </Row>
      <ThemedText type="small" themeColor="textSecondary">
        Zone grisée : {TARGET_MIN} à {TARGET_MAX} séries par muscle et par semaine, le repère courant pour progresser.
      </ThemedText>
      {rows.map((r, i) => (
        <Row key={r.group} style={styles.barRow}>
          <ThemedText type="small" style={styles.barLabel} numberOfLines={1}>
            {r.group}
          </ThemedText>
          <MuscleBar ratio={r.sets / scale} zone={[TARGET_MIN / scale, TARGET_MAX / scale]} delay={i * 45} />
          <ThemedText type="smallBold" themeColor={r.sets > 0 ? 'text' : 'textSecondary'} style={styles.barValue}>
            {r.sets}
          </ThemedText>
        </Row>
      ))}
    </Card>
  );
}

function RecordsTab({ data }: { data: Data }) {
  const theme = useTheme();
  if (data.records.size === 0) {
    return <Empty icon="trophy" text="Tes records apparaîtront après ta première séance." />;
  }
  return (
    <>
      {data.exercises
        .filter((e) => data.records.has(e.id))
        .map((e, i) => {
          const r = data.records.get(e.id)!;
          return (
            <Card key={e.id} onPress={() => router.push(`/exercise/${e.id}`)}>
              <Row style={styles.between}>
                <Row style={{ flex: 1 }}>
                  <Icon name="trophy.fill" size={16} />
                  <ThemedText type="default" style={{ fontWeight: 700, flexShrink: 1 }} numberOfLines={1}>
                    {e.name}
                  </ThemedText>
                </Row>
                <Icon name="chevron.right" size={10} color={theme.textSecondary} />
              </Row>
              <Row style={styles.recordRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="caps" themeColor="textSecondary">
                    Charge max
                  </ThemedText>
                  <ThemedText type="subtitle">{formatWeight(r.maxWeight.value, data.unit)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {shortDate(r.maxWeight.at)}
                  </ThemedText>
                </View>
                <View style={[styles.vDivider, { backgroundColor: theme.hairline }]} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="caps" themeColor="textSecondary">
                    1RM estimé
                  </ThemedText>
                  <ThemedText type="subtitle">{formatWeight(r.bestE1rm.value, data.unit)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {shortDate(r.bestE1rm.at)}
                  </ThemedText>
                </View>
              </Row>
            </Card>
          );
        })}
    </>
  );
}

function BodyweightTab({ data, onChange }: { data: Data; onChange: () => void }) {
  const theme = useTheme();
  const [value, setValue] = useState('');

  const log = async () => {
    const n = Number(value.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    await logBodyweight(dayKey(Date.now()), fromDisplay(n, data.unit));
    successHaptic();
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
        <ThemedText type="caps">Poids du jour</ThemedText>
        <Row>
          <Input
            style={{ flex: 1 }}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder={`ex. 180 ${data.unit}`}
          />
          <Button label="Noter" icon="checkmark" onPress={log} />
        </Row>
      </Card>
      {points.length >= 2 && (
        <Card key={points.length}>
          <ThemedText type="caps">Évolution</ThemedText>
          <LineChart points={points} format={(y) => `${y} ${data.unit}`} />
        </Card>
      )}
      {data.bodyweight.length > 0 && (
        <Card style={{ gap: 0 }}>
          {[...data.bodyweight].reverse().map((b, i) => (
            <Pressable key={b.id} onLongPress={() => remove(b.id, b.date)}>
              <Row style={[styles.listRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.hairline }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {b.date}
                </ThemedText>
                <ThemedText type="smallBold">{formatWeight(b.weightKg, data.unit)}</ThemedText>
              </Row>
            </Pressable>
          ))}
        </Card>
      )}
      {data.bodyweight.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          Appui long sur une pesée pour la supprimer.
        </ThemedText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  chipRow: { gap: 8, paddingRight: 16 },
  between: { justifyContent: 'space-between' },
  listRow: { justifyContent: 'space-between', paddingVertical: 11 },
  recordRow: { gap: 16, marginTop: 4 },
  vDivider: { width: 1, alignSelf: 'stretch' },
  barRow: { gap: 10 },
  barLabel: { width: 82 },
  barTrack: { flex: 1, height: 12, justifyContent: 'center' },
  targetZone: { position: 'absolute', top: 0, bottom: 0, opacity: 0.7, borderRadius: 3 },
  // Anchored to the left baseline, rounded only at the data end.
  bar: { height: 12, borderTopRightRadius: 4, borderBottomRightRadius: 4, overflow: 'hidden' },
  barValue: { width: 26, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
