import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Input, Row, Screen, SectionTitle, Stepper } from '@/components/ui';
import { getSettings } from '@/db/settings';
import { archiveTemplate, getTemplate, saveTemplate, type TemplateExercise } from '@/db/templates';
import { useTheme } from '@/hooks/use-theme';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function TemplateScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const templateId = id === 'new' ? null : Number(id);
  const [loaded, setLoaded] = useState(templateId === null);
  const [name, setName] = useState('');
  const [inRotation, setInRotation] = useState(true);
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

  const move = (i: number, delta: -1 | 1) =>
    setExercises((list) => {
      const j = i + delta;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Donne un nom à la séance', 'Par exemple Push, Pull, Legs, Haut du corps…');
      return;
    }
    await saveTemplate(templateId, name.trim(), inRotation, exercises);
    router.back();
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

  return (
    <>
      <Stack.Screen options={{ title: templateId === null ? 'Nouvelle séance' : name || 'Séance' }} />
      <Screen>
        <Input placeholder="Nom (ex. Push)" value={name} onChangeText={setName} />
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <ThemedText>Dans la rotation</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                L&apos;accueil te propose les séances de la rotation à tour de rôle.
              </ThemedText>
            </View>
            <Switch value={inRotation} onValueChange={setInRotation} trackColor={{ true: theme.accent }} />
          </Row>
        </Card>

        <SectionTitle>Exercices</SectionTitle>
        {exercises.map((ex, i) => (
          <Card key={`${ex.exerciseId}-${i}`}>
            <Row>
              <ThemedText style={{ flex: 1, fontWeight: 700 }}>{ex.name}</ThemedText>
              <Button label="↑" variant="ghost" small onPress={() => move(i, -1)} />
              <Button label="↓" variant="ghost" small onPress={() => move(i, 1)} />
              <Button
                label="✕"
                variant="danger"
                small
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
        ))}
        <Button label="+ Ajouter un exercice" variant="secondary" onPress={() => setPicking(true)} />
        <Button label="Enregistrer" onPress={save} />
        {templateId !== null && <Button label="Supprimer cette séance" variant="danger" onPress={remove} />}
      </Screen>
      <ExercisePicker
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={(ex) => {
          setPicking(false);
          setExercises((list) => [
            ...list,
            { exerciseId: ex.id, name: ex.name, targetSets: 3, targetReps: 10, restS: restDefault },
          ]);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  field: { justifyContent: 'space-between' },
  label: { flex: 1 },
});
