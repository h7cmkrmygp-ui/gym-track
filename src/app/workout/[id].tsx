import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, LinearTransition, SlideInDown, SlideOutDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExercisePicker } from '@/components/exercise-picker';
import { Icon } from '@/components/icon';
import { ProgressRing } from '@/components/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, IconButton, Input, PressableScale, Row, Screen } from '@/components/ui';
import { DisplayFont, Gold } from '@/constants/theme';
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
import { setDoneHaptic, successHaptic, tapHaptic } from '@/haptics';
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

export { ErrorScreen as ErrorBoundary } from '@/components/error-screen';

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
    if (kept) successHaptic();
    else Alert.alert('Séance vide', 'Aucune série faite : la séance n’a pas été gardée.');
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
          <Animated.View
            key={ex.exerciseId}
            layout={LinearTransition.springify().damping(20)}
            onLayout={i === current && i > 0 ? scrollToCurrent : undefined}>
            <ExerciseCard
              index={i}
              workoutId={workoutId}
              exercise={ex}
              active={active}
              isFirst={i === 0}
              isLast={i === detail.exercises.length - 1}
              unit={settings.unit}
              record={records.get(ex.exerciseId)}
              onChange={reload}
            />
          </Animated.View>
        ))}
        <Button label="Ajouter des exercices" icon="plus" variant="secondary" onPress={() => setPicking(true)} />
        {active ? (
          <>
            <Button label="Terminer la séance" icon="checkmark" onPress={finish} />
            <Button label="Annuler la séance" variant="danger" onPress={confirmDelete} />
          </>
        ) : (
          <Button label="Supprimer la séance" variant="danger" onPress={confirmDelete} />
        )}
        {/* Room for the floating rest panel, so it never hides the last buttons. */}
        <View style={{ height: 96 }} />
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

/** Ring of sets done and the elapsed time while training; date and length afterwards. */
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
    <Card glow index={0}>
      <Row style={styles.summaryRow}>
        <ProgressRing progress={sets.length ? done / sets.length : 0} size={84} stroke={7}>
          <ThemedText type="smallBold">
            {done}/{sets.length}
          </ThemedText>
        </ProgressRing>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="caps">{active ? 'En cours' : date}</ThemedText>
          <ThemedText type="subtitle">{duration}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {done} {done > 1 ? 'séries faites' : 'série faite'} sur {sets.length}
          </ThemedText>
        </View>
      </Row>
    </Card>
  );
}

function ExerciseCard({
  index,
  workoutId,
  exercise,
  active,
  isFirst,
  isLast,
  unit,
  record,
  onChange,
}: {
  index: number;
  workoutId: number;
  exercise: WorkoutExercise;
  active: boolean;
  isFirst: boolean;
  isLast: boolean;
  unit: Unit;
  record: ExerciseRecord | undefined;
  onChange: () => void;
}) {
  const theme = useTheme();
  const [plateauHidden, setPlateauHidden] = useState(false);
  const showPlateau =
    active && !plateauHidden && exercise.plateau !== null && exercise.sets.some((s) => s.completedAt === null);
  const allDone = exercise.sets.length > 0 && exercise.sets.every((s) => s.completedAt !== null);

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
    exercise.target && `${exercise.target.sets} × ${exercise.target.reps}`,
    `repos ${mmss(exercise.restS)}`,
  ].filter(Boolean);

  return (
    <Card index={index + 1}>
      <Row style={styles.exerciseHeader}>
        <View style={[styles.badge, { borderColor: allDone ? theme.accent : theme.hairline }]}>
          {allDone ? (
            <Icon name="checkmark" size={11} />
          ) : (
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              {index + 1}
            </ThemedText>
          )}
        </View>
        <Pressable style={{ flex: 1 }} onPress={() => router.push(`/exercise/${exercise.exerciseId}`)} hitSlop={6}>
          <Row style={{ gap: 6 }}>
            <ThemedText type="default" style={{ fontWeight: 700, flexShrink: 1 }} numberOfLines={1}>
              {exercise.name}
            </ThemedText>
            <Icon name="chevron.right" size={10} color={theme.textSecondary} />
          </Row>
          <ThemedText type="caps" themeColor="textSecondary" style={{ marginTop: 3 }}>
            {details.join(' · ')}
          </ThemedText>
        </Pressable>
        <IconButton icon="chevron.up" disabled={isFirst} onPress={() => move(-1)} />
        <IconButton icon="chevron.down" disabled={isLast} onPress={() => move(1)} />
        <IconButton icon="xmark" color={theme.danger} onPress={remove} />
      </Row>

      {showPlateau && (
        <Animated.View entering={FadeIn} style={[styles.plateau, { borderColor: theme.hairline }]}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon name="exclamationmark.triangle.fill" size={14} />
            <ThemedText type="small" style={{ flex: 1 }}>
              Pas de progrès depuis 3 séances. Un deload à{' '}
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                {formatWeight(exercise.plateau!.deloadKg, unit)}
              </ThemedText>{' '}
              (−10 %) aide souvent à repartir.
            </ThemedText>
          </Row>
          <Row>
            <Button label="Appliquer" small onPress={applyDeload} />
            <Button label="Ignorer" variant="ghost" small onPress={() => setPlateauHidden(true)} />
          </Row>
        </Animated.View>
      )}

      <Row style={styles.tableHead}>
        <ThemedText type="caps" themeColor="textSecondary" style={styles.colIndex}>
          #
        </ThemedText>
        <ThemedText type="caps" themeColor="textSecondary" style={styles.colPrev}>
          Préc.
        </ThemedText>
        <ThemedText type="caps" themeColor="textSecondary" style={styles.colInputHead}>
          {unit}
        </ThemedText>
        <ThemedText type="caps" themeColor="textSecondary" style={styles.colInputHead}>
          reps
        </ThemedText>
        <View style={styles.colCheck} />
      </Row>
      {exercise.sets.map((set, i) => (
        <Animated.View key={`${set.id}-${unit}-${set.weightKg}`} layout={LinearTransition.duration(250)}>
          <SetRow
            index={i}
            set={set}
            previous={exercise.previous[i]}
            unit={unit}
            record={record}
            exercise={exercise}
            onChange={onChange}
          />
        </Animated.View>
      ))}
      <Button
        label="Série"
        icon="plus"
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
  const isRecord = flags !== null && (flags.weight || flags.e1rm);
  // Prefilled heavier than last time: the progression suggestion.
  const progressed = !done && previous !== undefined && set.weightKg > previous.weightKg + 0.01;

  // Saved on every keystroke, so nothing is lost when leaving the screen with the keyboard open.
  const save = (w: string, r: string) => updateSet(set.id, fromDisplay(parseNumber(w), unit), Math.round(parseNumber(r)));

  const toggle = async () => {
    await save(weight, reps);
    await setSetDone(set.id, !done);
    if (!done) {
      const next = { ...set, workoutId: 0, at: Date.now(), weightKg: fromDisplay(parseNumber(weight), unit), reps: Math.round(parseNumber(reps)) };
      const willBeRecord = prFlags(next, record);
      if (willBeRecord.weight || willBeRecord.e1rm) successHaptic();
      else setDoneHaptic();
      startRest(exercise.restS, exercise.name);
    }
    onChange();
  };

  const copyPrevious = async () => {
    if (!previous || done) return;
    tapHaptic();
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

  const inputStyle = [styles.colInput, done && { color: theme.accent, borderColor: 'rgba(227, 211, 181, 0.35)' }];

  return (
    <Pressable onLongPress={confirmDelete}>
      <Row style={[styles.setRow, done && { backgroundColor: 'rgba(227, 211, 181, 0.06)' }]}>
        <ThemedText type="smallBold" style={[styles.colIndex, { color: done ? theme.accent : theme.textSecondary }]}>
          {index + 1}
        </ThemedText>
        <Pressable style={styles.colPrev} onPress={copyPrevious} hitSlop={6}>
          <Row style={{ gap: 4 }}>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {previous ? `${toDisplay(previous.weightKg, unit)}×${previous.reps}` : '—'}
            </ThemedText>
            {progressed && <Icon name="arrow.up" size={10} />}
          </Row>
        </Pressable>
        <Input
          style={inputStyle}
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
          style={inputStyle}
          value={reps}
          onChangeText={(r) => {
            setReps(r);
            save(weight, r);
          }}
          keyboardType="number-pad"
          placeholder="0"
          selectTextOnFocus
        />
        <PressableScale
          onPress={toggle}
          hitSlop={8}
          style={[styles.colCheck, styles.check, { borderColor: done ? 'transparent' : theme.hairline }]}>
          {done ? (
            <Animated.View entering={ZoomIn.springify().damping(12)} style={StyleSheet.absoluteFill}>
              <LinearGradient colors={Gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.checkFill}>
                <Icon name="checkmark" size={14} color={theme.onAccent} weight="bold" />
              </LinearGradient>
            </Animated.View>
          ) : (
            <Icon name="checkmark" size={14} color={theme.textSecondary} />
          )}
        </PressableScale>
      </Row>
      {isRecord && (
        <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.pr}>
          <Icon name="trophy.fill" size={12} />
          <ThemedText type="caps">{flags!.weight ? 'Record de charge' : 'Record de 1RM estimé'}</ThemedText>
        </Animated.View>
      )}
    </Pressable>
  );
}

/** Floating rest panel: a gold ring that empties, the time left and quick adjustments. */
function RestBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const timer = useRestTimer();
  const [now, setNow] = useState(() => Date.now());
  const notifiedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [timer]);

  const remaining = timer ? Math.max(0, (timer.endsAt - now) / 1000) : 0;
  const over = timer !== null && remaining <= 0;

  // A haptic when the rest is over, once per timer.
  useEffect(() => {
    if (over && timer && notifiedFor.current !== timer.endsAt) {
      notifiedFor.current = timer.endsAt;
      successHaptic();
    }
  }, [over, timer]);

  if (!timer) return null;

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown.duration(220)}
      style={[
        styles.restBar,
        { backgroundColor: 'rgba(18, 19, 22, 0.97)', borderColor: theme.hairline, marginBottom: insets.bottom + 8 },
      ]}>
      <Row style={{ gap: 14 }}>
        <ProgressRing countdown={{ endsAt: timer.endsAt, totalMs: timer.totalS * 1000 }} size={58} stroke={5}>
          <Icon name={over ? 'checkmark' : 'timer'} size={16} />
        </ProgressRing>
        <View style={{ flex: 1 }}>
          <ThemedText type="caps">{over ? 'Repos terminé' : 'Repos'}</ThemedText>
          <ThemedText style={styles.restTime}>{mmss(Math.ceil(remaining))}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {timer.exerciseName}
          </ThemedText>
        </View>
        <View style={{ gap: 6 }}>
          <Row style={{ gap: 6 }}>
            <Button label="−15" variant="secondary" small onPress={() => addRest(-15)} />
            <Button label="+15" variant="secondary" small onPress={() => addRest(15)} />
          </Row>
          <Button label={over ? 'OK' : 'Passer'} small onPress={stopRest} />
        </View>
      </Row>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { gap: 16 },
  exerciseHeader: { alignItems: 'center', gap: 10 },
  badge: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tableHead: { marginTop: 4 },
  setRow: { borderRadius: 12, paddingVertical: 5, paddingHorizontal: 4 },
  colIndex: { width: 18, textAlign: 'center' },
  colPrev: { flex: 1 },
  colInput: { width: 72, textAlign: 'center', paddingVertical: 8, fontWeight: 600, fontVariant: ['tabular-nums'] },
  colInputHead: { width: 72, textAlign: 'center' },
  colCheck: { width: 36 },
  check: { height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  checkFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pr: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 26, marginTop: 4 },
  plateau: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10, backgroundColor: 'rgba(227, 211, 181, 0.05)' },
  restBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  restTime: { fontFamily: DisplayFont.semibold, fontSize: 34, lineHeight: 38, fontVariant: ['tabular-nums'] },
});
