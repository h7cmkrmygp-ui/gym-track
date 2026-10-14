import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExercisePicker } from '@/components/exercise-picker';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Input, Row, Screen } from '@/components/ui';
import { getSettings } from '@/db/settings';
import {
  addExerciseToWorkout,
  addSet,
  deleteSet,
  deleteWorkout,
  finishWorkout,
  getWorkoutDetail,
  recordsBefore,
  removeExerciseFromWorkout,
  setSetDone,
  updateSet,
  type PreviousSet,
  type WorkoutExercise,
  type WorkoutSet,
} from '@/db/workouts';
import { useFocusData } from '@/hooks/use-focus-data';
import { useTheme } from '@/hooks/use-theme';
import { prFlags, type ExerciseRecord } from '@/logic/records';
import { fromDisplay, toDisplay, type Unit } from '@/logic/units';
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

  if (!data) return <Screen>{null}</Screen>;
  const { detail, settings, records } = data;
  if (!detail) return <Screen>{<ThemedText>Séance introuvable.</ThemedText>}</Screen>;
  const active = detail.endedAt === null;

  const finish = async () => {
    const { kept } = await finishWorkout(workoutId);
    await stopRest();
    if (!kept) Alert.alert('Séance vide', 'Aucune série cochée : la séance n’a pas été gardée.');
    router.back();
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
      <Screen>
        {detail.exercises.length === 0 && (
          <ThemedText themeColor="textSecondary">Ajoute un premier exercice pour commencer.</ThemedText>
        )}
        {detail.exercises.map((ex) => (
          <ExerciseCard
            key={ex.exerciseId}
            workoutId={workoutId}
            exercise={ex}
            unit={settings.unit}
            record={records.get(ex.exerciseId)}
            onChange={reload}
          />
        ))}
        <Button label="+ Ajouter un exercice" variant="secondary" onPress={() => setPicking(true)} />
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
        onPick={async (ex) => {
          setPicking(false);
          await addExerciseToWorkout(workoutId, ex.id);
          reload();
        }}
      />
    </View>
  );
}

function ExerciseCard({
  workoutId,
  exercise,
  unit,
  record,
  onChange,
}: {
  workoutId: number;
  exercise: WorkoutExercise;
  unit: Unit;
  record: ExerciseRecord | undefined;
  onChange: () => void;
}) {
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

  return (
    <Card>
      <Row style={styles.exerciseHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText type="default" style={{ fontWeight: 700 }}>
            {exercise.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Repos {mmss(exercise.restS)}
          </ThemedText>
        </View>
        <Button label="Retirer" variant="danger" small onPress={remove} />
      </Row>
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
          key={set.id}
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
        label="+ Série"
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

  const save = () => updateSet(set.id, fromDisplay(parseNumber(weight), unit), Math.round(parseNumber(reps)));

  const toggle = async () => {
    await save();
    await setSetDone(set.id, !done);
    if (!done) startRest(exercise.restS, exercise.name);
    onChange();
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
        <ThemedText type="small" themeColor="textSecondary" style={styles.colPrev} numberOfLines={1}>
          {previous ? `${toDisplay(previous.weightKg, unit)}×${previous.reps}` : '—'}
          {progressed && <ThemedText type="smallBold" style={{ color: theme.accent }}> ↑</ThemedText>}
        </ThemedText>
        <Input
          style={styles.colInput}
          value={weight}
          onChangeText={setWeight}
          onEndEditing={save}
          keyboardType="decimal-pad"
          placeholder="0"
          selectTextOnFocus
        />
        <Input
          style={styles.colInput}
          value={reps}
          onChangeText={setReps}
          onEndEditing={save}
          keyboardType="number-pad"
          placeholder="0"
          selectTextOnFocus
        />
        <Pressable
          onPress={toggle}
          hitSlop={8}
          style={[
            styles.colCheck,
            styles.check,
            { backgroundColor: done ? theme.success : theme.backgroundSelected },
          ]}>
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
        <Button label="+15 s" variant="secondary" small onPress={() => addRest(15)} />
        <Button label={remaining > 0 ? 'Passer' : 'OK'} small onPress={stopRest} />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  exerciseHeader: { alignItems: 'flex-start' },
  setRow: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 4 },
  colIndex: { width: 18, textAlign: 'center' },
  colPrev: { flex: 1 },
  colInput: { width: 70, textAlign: 'center', paddingVertical: 6 },
  colCheck: { width: 34 },
  check: { height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pr: { marginLeft: 26, marginTop: 2 },
  restBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 10, paddingHorizontal: 16 },
  restProgress: { position: 'absolute', top: 0, left: 0, height: 3 },
  restRow: { gap: 8 },
});
