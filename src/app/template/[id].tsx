import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { ExercisePicker } from '@/components/exercise-picker';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, IconButton, Input, Row, Screen, SectionTitle, Stepper } from '@/components/ui';
import { getSettings } from '@/db/settings';
import { archiveTemplate, getTemplate, saveTemplate, type TemplateExercise } from '@/db/templates';
import { getActiveWorkout, startWorkout } from '@/db/workouts';
import { useTheme } from '@/hooks/use-theme';
import { moveItem } from '@/logic/workout';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Edits a workout template. With `?start=1` (from the home screen) it plans a workout
 * to start right away, optionally kept for later.
 */
export default function TemplateScreen() {
  const theme = useTheme();
  const { id, start } = useLocalSearchParams<{ id: string; start?: string }>();
  const templateId = id === 'new' ? null : Number(id);
  const planning = start === '1';
  const [loaded, setLoaded] = useState(templateId === null);
  const [name, setName] = useState('');
  // A one-off workout should not change which session the split suggests next.
  const [inRotation, setInRotation] = useState(!planning);
  const [keep, setKeep] = useState(true);
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [restDefault, setRestDefault] = useState(90);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    getSettings().then((s) => setRestDefault(s.restDefaultS));
    if (templateId === null) return;
    getTemplate(templateId).then((t) => {
      if (t) {
        setName(t.name);
        setInRotation(t.rotationOrder !== null);
        setExercises(t.exercises);
      }
      setLoaded(true);
    });
  }, [templateId]);

  const update = (i: number, patch: Partial<TemplateExercise>) =>
    setExercises((list) => list.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Donne un nom à la séance', 'Par exemple Push, Pull, Legs, Haut du corps…');
      return;
    }
    await saveTemplate(templateId, name.trim(), inRotation, exercises);
    router.back();
  };

  const saveAndStart = async () => {
    if (exercises.length === 0) {
      Alert.alert('Ajoute au moins un exercice');
      return;
    }
    const active = await getActiveWorkout();
    if (active) {
      Alert.alert('Une séance est déjà en cours', `Termine « ${active.name} » avant d’en commencer une autre.`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Reprendre', onPress: () => router.replace(`/workout/${active.id}`) },
      ]);
      return;
    }
    const savedId = await saveTemplate(templateId, name.trim() || 'Ma séance', keep && inRotation, exercises);
    const workoutId = await startWorkout(savedId);
    // Not kept: the workout still links to it (for rest times), but it leaves the list.
    if (!keep) await archiveTemplate(savedId);
    router.replace(`/workout/${workoutId}`);
  };

  const remove = () =>
    Alert.alert(`Supprimer ${name} ?`, 'Tes séances passées restent dans l’historique.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await archiveTemplate(templateId!);
          router.back();
        },
      },
    ]);

  if (!loaded) return <Screen>{null}</Screen>;

  const title = planning ? 'Créer une séance' : templateId === null ? 'Nouvelle séance' : name || 'Séance';

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen>
        <ThemedText type="caps">Nom</ThemedText>
        <Input
          placeholder={planning ? 'Nom (optionnel, ex. Bras)' : 'Nom (ex. Push)'}
          value={name}
          onChangeText={setName}
        />

        <SectionTitle>Exercices</SectionTitle>
        {exercises.length === 0 && (
          <Card style={styles.empty}>
            <Icon name="list.bullet.rectangle" size={26} />
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              Ajoute tes exercices, puis règle les séries, les reps et le repos de chacun.
            </ThemedText>
          </Card>
        )}
        {exercises.map((ex, i) => (
          <Animated.View key={`${ex.exerciseId}-${i}`} layout={LinearTransition.springify().damping(20)}>
            <Card>
              <Row style={{ gap: 10 }}>
                <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    {i + 1}
                  </ThemedText>
                </View>
                <ThemedText style={{ flex: 1, fontWeight: 700 }} numberOfLines={1}>
                  {ex.name}
                </ThemedText>
                <IconButton
                  icon="chevron.up"
                  disabled={i === 0}
                  onPress={() => setExercises((l) => moveItem(l, i, -1))}
                />
                <IconButton
                  icon="chevron.down"
                  disabled={i === exercises.length - 1}
                  onPress={() => setExercises((l) => moveItem(l, i, 1))}
                />
                <IconButton
                  icon="xmark"
                  color={theme.danger}
                  onPress={() => setExercises((list) => list.filter((_, j) => j !== i))}
                />
              </Row>
              <Row style={styles.field}>
                <ThemedText type="small" style={styles.label}>
                  Séries
                </ThemedText>
                <Stepper value={ex.targetSets} min={1} max={10} onChange={(v) => update(i, { targetSets: v })} />
              </Row>
              <Row style={styles.field}>
                <ThemedText type="small" style={styles.label}>
                  Reps
                </ThemedText>
                <Stepper value={ex.targetReps} min={1} max={50} onChange={(v) => update(i, { targetReps: v })} />
              </Row>
              <Row style={styles.field}>
                <ThemedText type="small" style={styles.label}>
                  Repos
                </ThemedText>
                <Stepper
                  value={ex.restS}
                  min={0}
                  max={600}
                  step={15}
                  format={mmss}
                  onChange={(v) => update(i, { restS: v })}
                />
              </Row>
            </Card>
          </Animated.View>
        ))}
        <Button label="Ajouter des exercices" icon="plus" variant="secondary" onPress={() => setPicking(true)} />

        <Card>
          {planning && (
            <Row style={styles.field}>
              <View style={{ flex: 1 }}>
                <ThemedText>Garder dans mes séances</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Pour la refaire plus tard sans tout recréer.
                </ThemedText>
              </View>
              <Switch value={keep} onValueChange={setKeep} trackColor={{ true: theme.accent }} />
            </Row>
          )}
          {(!planning || keep) && (
            <Row style={styles.field}>
              <View style={{ flex: 1 }}>
                <ThemedText>Dans la rotation</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  L&apos;accueil te propose les séances de la rotation à tour de rôle.
                </ThemedText>
              </View>
              <Switch value={inRotation} onValueChange={setInRotation} trackColor={{ true: theme.accent }} />
            </Row>
          )}
        </Card>

        {planning ? (
          <Button label="Commencer la séance" icon="play.fill" onPress={saveAndStart} />
        ) : (
          <>
            <Button label="Enregistrer" icon="checkmark" onPress={save} />
            <Button
              label={templateId === null ? 'Enregistrer et commencer' : 'Commencer cette séance'}
              icon="play.fill"
              variant="secondary"
              onPress={saveAndStart}
            />
          </>
        )}
        {templateId !== null && <Button label="Supprimer cette séance" variant="danger" onPress={remove} />}
      </Screen>
      <ExercisePicker
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={(picked) => {
          setPicking(false);
          setExercises((list) => [
            ...list,
            ...picked.map((ex) => ({
              exerciseId: ex.id,
              name: ex.name,
              targetSets: 3,
              targetReps: 10,
              restS: restDefault,
            })),
          ]);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  field: { justifyContent: 'space-between' },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
});
