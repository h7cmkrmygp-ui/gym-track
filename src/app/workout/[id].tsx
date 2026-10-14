import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExercisePicker } from '@/components/exercise-picker';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Input, Row, Screen } from '@/components/ui';
import { getSettings } from '@/db/settings';
import {
  addExerciseToWorkout,
  addSet,
  completeUncheckedSets,
  countUncheckedSets,
  deleteSet,
  deleteWorkout,
  finishWorkout,
  getWorkoutDetail,
  moveExerciseInWorkout,
  recordsBefore,
  removeExerciseFromWorkout,
  setRemainingWeight,
  setSetDone,
  updateSet,
  type PreviousSet,
  type WorkoutDetail,
  type WorkoutExercise,
  type WorkoutSet,
} from '@/db/workouts';
import { useFocusData } from '@/hooks/use-focus-data';
import { useTheme } from '@/hooks/use-theme';
import { prFlags, type ExerciseRecord } from '@/logic/records';
import { formatWeight, fromDisplay, toDisplay, type Unit } from '@/logic/units';
import { currentExerciseIndex, formatDuration } from '@/logic/workout';
import { addRest, startRest, stopRest, useRestTimer } from '@/state/rest-timer';

const parseNumber = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

async function loadWorkout(workoutId: number) {
  const [detail, settings, records] = await Promise.all([
    getWorkoutDetail(workoutId),
    getSettings(),
    recordsBefore(workoutId),
  ]);
  return { detail, settings, records };
}

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  const [picking, setPicking] = useState(false);
  const [data, reload] = useFocusData(loadWorkout, workoutId);
  const scrollRef = useRef<ScrollView>(null);
  const scrolledToCurrent = useRef(false);

  if (!data) return <Screen>{null}</Screen>;
  const { detail, settings, records } = data;
  if (!detail) return <Screen>{<ThemedText>Séance introuvable.</ThemedText>}</Screen>;
  const active = detail.endedAt === null;
  const current = active ? currentExerciseIndex(detail.exercises) : 0;

  // Opening a workout in progress jumps to the exercise being done, once.
  const scrollToCurrent = (e: LayoutChangeEvent) => {
    if (scrolledToCurrent.current) return;
    scrolledToCurrent.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 12), animated: false });
  };

  const close = async () => {
    const { kept } = await finishWorkout(workoutId);
    await stopRest();
    if (!kept) Alert.alert('Séance vide', 'Aucune série faite : la séance n’a pas été gardée.');
    router.back();
  };

  const finish = async () => {
    Keyboard.dismiss();
    const unchecked = await countUncheckedSets(workoutId);
    if (unchecked === 0) return close();
    const s = unchecked > 1 ? 's' : '';
    Alert.alert(`${unchecked} série${s} pas cochée${s}`, `Tu l${s ? 'es' : 'a'} as faite${s} ?`, [
      {
        text: `Oui, ${s ? 'les' : 'la'} compter`,
        onPress: async () => {
          await completeUncheckedSets(workoutId);
          await close();
        },
      },
      { text: `Non, ${s ? 'les' : 'la'} supprimer`, style: 'destructive', onPress: close },
      { text: 'Continuer la séance', style: 'cancel' },
    ]);
  };

  const confirmDelete = () =>
    Alert.alert('Supprimer la séance ?', 'Toutes ses séries seront effacées.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkout(workoutId);
          await stopRest();
          router.back();
        },
      },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: detail.name }} />
      <Screen scrollRef={scrollRef}>
        <Summary detail={detail} />
        {detail.exercises.length === 0 && (
          <ThemedText themeColor="textSecondary">Ajoute tes exercices pour commencer.</ThemedText>
        )}
        {detail.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.exerciseId}
            workoutId={workoutId}
            exercise={ex}
            active={active}
            isFirst={i === 0}
            isLast={i === detail.exercises.length - 1}
            unit={settings.unit}
            record={records.get(ex.exerciseId)}
            onChange={reload}
            onLayout={i === current && i > 0 ? scrollToCurrent : undefined}
          />
        ))}
        <Button label="＋ Ajouter des exercices" variant="secondary" onPress={() => setPicking(true)} />
        {active ? (
          <>
            <Button label="Terminer la séance" onPress={finish} />
            <Button label="Annuler la séance" variant="danger" onPress={confirmDelete} />
          </>
        ) : (
          <Button label="Supprimer la séance" variant="danger" onPress={confirmDelete} />
        )}
      </Screen>
      <RestBar />
      <ExercisePicker
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={async (exercises) => {
          setPicking(false);
          for (const ex of exercises) await addExerciseToWorkout(workoutId, ex.id);
          reload();
        }}
      />
    </View>
  );
}

/** "12/18 séries · 42 min" while training, the date and length afterwards. */
function Summary({ detail }: { detail: WorkoutDetail }) {
  const active = detail.endedAt === null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [active]);

  const sets = detail.exercises.flatMap((e) => e.sets);
  const done = sets.filter((s) => s.completedAt !== null).length;
  const duration = formatDuration((detail.endedAt ?? now) - detail.startedAt);
  const date = new Date(detail.startedAt).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.summary}>
      {active ? `${done}/${sets.length} séries · ${duration}` : `${date} · ${duration} · ${done} séries`}
    </ThemedText>
  );
}

function ExerciseCard({
  workoutId,
  exercise,
  active,
  isFirst,
  isLast,
  unit,
  record,
  onChange,
  onLayout,
}: {
  workoutId: number;
  exercise: WorkoutExercise;
  active: boolean;
  isFirst: boolean;
  isLast: boolean;
  unit: Unit;
  record: ExerciseRecord | undefined;
  onChange: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const theme = useTheme();
  const [plateauHidden, setPlateauHidden] = useState(false);
  const showPlateau =
    active && !plateauHidden && exercise.plateau !== null && exercise.sets.some((s) => s.completedAt === null);

  const applyDeload = async () => {
    await setRemainingWeight(workoutId, exercise.exerciseId, exercise.plateau!.deloadKg);
    setPlateauHidden(true);
    onChange();
  };
  const move = async (delta: -1 | 1) => {
    await moveExerciseInWorkout(workoutId, exercise.exerciseId, delta);
    onChange();
  };

  const remove = () =>
    Alert.alert(`Retirer ${exercise.name} ?`, undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          await removeExerciseFromWorkout(workoutId, exercise.exerciseId);
          onChange();
        },
      },
    ]);

  const details = [
    exercise.target && `Objectif ${exercise.target.sets} × ${exercise.target.reps}`,
    `Repos ${mmss(exercise.restS)}`,
  ].filter(Boolean);

  return (
    <Card onLayout={onLayout}>
      <Row style={styles.exerciseHeader}>
        <Pressable style={{ flex: 1 }} onPress={() => router.push(`/exercise/${exercise.exerciseId}`)} hitSlop={6}>
          <ThemedText type="default" style={{ fontWeight: 700 }}>
            {exercise.name} <ThemedText type="small" themeColor="textSecondary">›</ThemedText>
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {details.join(' · ')}
          </ThemedText>
        </Pressable>
        <Button label="↑" variant="ghost" small disabled={isFirst} onPress={() => move(-1)} />
        <Button label="↓" variant="ghost" small disabled={isLast} onPress={() => move(1)} />
        <Button label="✕" variant="danger" small onPress={remove} />
      </Row>
      {showPlateau && (
        <View style={[styles.plateau, { borderColor: theme.accent }]}>
          <ThemedText type="small">
            ⚠️ Pas de progrès depuis 3 séances. Un deload à{' '}
            <ThemedText type="smallBold">{formatWeight(exercise.plateau!.deloadKg, unit)}</ThemedText> (−10 %)
            aide souvent à repartir.
          </ThemedText>
          <Row>
            <Button label="Appliquer" small onPress={applyDeload} />
            <Button label="Ignorer" variant="ghost" small onPress={() => setPlateauHidden(true)} />
          </Row>
        </View>
      )}
      <Row>
        <ThemedText type="small" themeColor="textSecondary" style={styles.colIndex}>
          #
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.colPrev}>
          Préc.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.colInput}>
          {unit}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.colInput}>
          reps
        </ThemedText>
        <View style={styles.colCheck} />
      </Row>
      {exercise.sets.map((set, i) => (
        <SetRow
          // Remount when the unit or the saved weight changes (e.g. a deload) so the fields follow.
          key={`${set.id}-${unit}-${set.weightKg}`}
          index={i}
          set={set}
          previous={exercise.previous[i]}
          unit={unit}
          record={record}
          exercise={exercise}
          onChange={onChange}
        />
      ))}
      <Button
        label="＋ Série"
        variant="ghost"
        small
        onPress={async () => {
          await addSet(workoutId, exercise.exerciseId);
          onChange();
        }}
      />
    </Card>
  );
}

function SetRow({
  index,
  set,
  previous,
  unit,
  record,
  exercise,
  onChange,
}: {
  index: number;
  set: WorkoutSet;
  previous: PreviousSet | undefined;
  unit: Unit;
  record: ExerciseRecord | undefined;
  exercise: WorkoutExercise;
  onChange: () => void;
}) {
  const theme = useTheme();
  const [weight, setWeight] = useState(set.weightKg ? String(toDisplay(set.weightKg, unit)) : '');
  const [reps, setReps] = useState(set.reps ? String(set.reps) : '');
  const done = set.completedAt !== null;
  const flags = done ? prFlags({ ...set, workoutId: 0, at: set.completedAt! }, record) : null;
  // Prefilled heavier than last time: the progression suggestion.
  const progressed = !done && previous !== undefined && set.weightKg > previous.weightKg + 0.01;

  // Saved on every keystroke, so nothing is lost when leaving the screen with the keyboard open.
  const save = (w: string, r: string) => updateSet(set.id, fromDisplay(parseNumber(w), unit), Math.round(parseNumber(r)));

  const toggle = async () => {
    await save(weight, reps);
    await setSetDone(set.id, !done);
    if (!done) startRest(exercise.restS, exercise.name);
    onChange();
  };

  const copyPrevious = async () => {
    if (!previous || done) return;
    const w = previous.weightKg ? String(toDisplay(previous.weightKg, unit)) : '';
    const r = String(previous.reps);
    setWeight(w);
    setReps(r);
    await updateSet(set.id, previous.weightKg, previous.reps);
  };

  const confirmDelete = () =>
    Alert.alert(`Supprimer la série ${index + 1} ?`, undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteSet(set.id);
          onChange();
        },
      },
    ]);

  return (
    <Pressable onLongPress={confirmDelete}>
      <Row style={[styles.setRow, done && { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold" style={styles.colIndex}>
          {index + 1}
        </ThemedText>
        <Pressable style={styles.colPrev} onPress={copyPrevious} hitSlop={6}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {previous ? `${toDisplay(previous.weightKg, unit)}×${previous.reps}` : '—'}
            {progressed && <ThemedText type="smallBold" style={{ color: theme.accent }}> ↑</ThemedText>}
          </ThemedText>
        </Pressable>
        <Input
          style={styles.colInput}
          value={weight}
          onChangeText={(w) => {
            setWeight(w);
            save(w, reps);
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          selectTextOnFocus
        />
        <Input
          style={styles.colInput}
          value={reps}
          onChangeText={(r) => {
            setReps(r);
            save(weight, r);
          }}
          keyboardType="number-pad"
          placeholder="0"
          selectTextOnFocus
        />
        <Pressable
          onPress={toggle}
          hitSlop={8}
          style={[styles.colCheck, styles.check, { backgroundColor: done ? theme.success : theme.backgroundSelected }]}>
          <ThemedText type="smallBold" style={{ color: done ? '#fff' : theme.textSecondary }}>
            ✓
          </ThemedText>
        </Pressable>
      </Row>
      {flags && (flags.weight || flags.e1rm) && (
        <ThemedText type="small" style={[styles.pr, { color: theme.accent }]}>
          🏆 {flags.weight ? 'Record de charge' : 'Record de 1RM estimé'}
        </ThemedText>
      )}
    </Pressable>
  );
}

function RestBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const timer = useRestTimer();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [timer]);

  if (!timer) return null;
  const remaining = Math.max(0, (timer.endsAt - now) / 1000);
  const progress = timer.totalS > 0 ? remaining / timer.totalS : 0;

  return (
    <View style={[styles.restBar, { backgroundColor: theme.backgroundElement, paddingBottom: insets.bottom + 8 }]}>
      <View style={[styles.restProgress, { backgroundColor: theme.accent, width: `${progress * 100}%` }]} />
      <Row style={styles.restRow}>
        <View style={{ flex: 1 }}>
          <ThemedText type="small" themeColor="textSecondary">
            {remaining > 0 ? 'Repos' : 'Repos terminé'}
          </ThemedText>
          <ThemedText type="subtitle">{mmss(Math.ceil(remaining))}</ThemedText>
        </View>
        <Button label="−15 s" variant="secondary" small onPress={() => addRest(-15)} />
        <Button label="+15 s" variant="secondary" small onPress={() => addRest(15)} />
        <Button label={remaining > 0 ? 'Passer' : 'OK'} small onPress={stopRest} />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { textTransform: 'capitalize' },
  exerciseHeader: { alignItems: 'flex-start' },
  setRow: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 4 },
  colIndex: { width: 18, textAlign: 'center' },
  colPrev: { flex: 1 },
  colInput: { width: 70, textAlign: 'center', paddingVertical: 6 },
  colCheck: { width: 34 },
  check: { height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pr: { marginLeft: 26, marginTop: 2 },
  plateau: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8 },
  restBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 10, paddingHorizontal: 16 },
  restProgress: { position: 'absolute', top: 0, left: 0, height: 3 },
  restRow: { gap: 8 },
});
