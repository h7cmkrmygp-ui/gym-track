import { useEffect, useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button, Input, Row } from '@/components/ui';
import { MUSCLE_GROUPS } from '@/data/exercises.fr';
import { createExercise, listExercises, type Exercise } from '@/db/exercises';
import { useTheme } from '@/hooks/use-theme';

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Full-screen sheet to pick an exercise, or create a custom one from the search text. */
export function ExercisePicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (exercise: Exercise) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [newGroup, setNewGroup] = useState<string | null>(null);

  useEffect(() => {
    if (visible) listExercises().then(setAll);
  }, [visible]);

  const reset = () => {
    setQuery('');
    setNewGroup(null);
  };
  const close = () => {
    reset();
    onClose();
  };
  const pick = (exercise: Exercise) => {
    reset();
    onPick(exercise);
  };

  const q = normalize(query);
  const filtered = q ? all.filter((e) => normalize(e.name).includes(q)) : all;
  const sections: { title: string; data: Exercise[] }[] = MUSCLE_GROUPS.map((g) => ({
    title: g as string,
    data: filtered.filter((e) => e.muscleGroup === g),
  }))
    .concat([{ title: 'Autres', data: filtered.filter((e) => !(MUSCLE_GROUPS as readonly string[]).includes(e.muscleGroup)) }])
    .filter((s) => s.data.length > 0);
  const exactMatch = all.some((e) => normalize(e.name) === q);

  const create = async () => {
    if (!newGroup) return;
    pick(await createExercise(query.trim(), newGroup));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom }]}>
        <Row style={styles.header}>
          <ThemedText type="default" style={{ fontWeight: 700, flex: 1 }}>
            Choisir un exercice
          </ThemedText>
          <Button label="Fermer" variant="ghost" small onPress={close} />
        </Row>
        <Input placeholder="Rechercher ou créer…" value={query} onChangeText={setQuery} autoCorrect={false} />

        {q.length > 0 && !exactMatch && (
          <View style={[styles.create, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Créer « {query.trim()} »</ThemedText>
            <View style={styles.chips}>
              {MUSCLE_GROUPS.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setNewGroup(g)}
                  style={[styles.chip, { backgroundColor: g === newGroup ? theme.accent : theme.backgroundSelected }]}>
                  <ThemedText type="small" style={g === newGroup ? { color: theme.onAccent } : undefined}>
                    {g}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <Button label="Créer l'exercice" small disabled={!newGroup} onPress={create} />
          </View>
        )}

        <SectionList
          sections={sections}
          keyExtractor={(e) => String(e.id)}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => pick(item)}
              style={({ pressed }) => [styles.item, { borderColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 }]}>
              <ThemedText>{item.name}</ThemedText>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, padding: 16, gap: 12 },
  header: { justifyContent: 'space-between' },
  create: { borderRadius: 12, padding: 12, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  sectionHeader: { textTransform: 'uppercase', marginTop: 16, marginBottom: 4 },
  item: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
