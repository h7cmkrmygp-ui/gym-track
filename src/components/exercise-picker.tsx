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

/** Full-screen sheet to tick one or more exercises, or create new ones. */
export function ExercisePicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  /** The ticked exercises, in the order they were ticked. */
  onPick: (exercises: Exercise[]) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [form, setForm] = useState<{ name: string; group: string | null } | null>(null);

  useEffect(() => {
    if (visible) listExercises().then(setAll);
  }, [visible]);

  const reset = () => {
    setQuery('');
    setSelected([]);
    setForm(null);
  };
  const close = () => {
    reset();
    onClose();
  };
  const confirm = () => {
    const picked = selected;
    reset();
    onPick(picked);
  };
  const toggle = (exercise: Exercise) =>
    setSelected((list) =>
      list.some((e) => e.id === exercise.id) ? list.filter((e) => e.id !== exercise.id) : [...list, exercise],
    );

  const create = async () => {
    if (!form?.name.trim() || !form.group) return;
    const exercise = await createExercise(form.name.trim(), form.group);
    setAll((list) => (list.some((e) => e.id === exercise.id) ? list : [...list, exercise]));
    setSelected((list) => (list.some((e) => e.id === exercise.id) ? list : [...list, exercise]));
    setForm(null);
    setQuery('');
  };

  const q = normalize(query);
  const filtered = q ? all.filter((e) => normalize(e.name).includes(q)) : all;
  const known = MUSCLE_GROUPS as readonly string[];
  const sections: { title: string; data: Exercise[] }[] = [
    ...MUSCLE_GROUPS.map((g) => ({ title: g as string, data: filtered.filter((e) => e.muscleGroup === g) })),
    { title: 'Autres', data: filtered.filter((e) => !known.includes(e.muscleGroup)) },
  ].filter((s) => s.data.length > 0);
  const exactMatch = all.some((e) => normalize(e.name) === q);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + 8 }]}>
        <Row style={styles.header}>
          <ThemedText type="default" style={{ fontWeight: 700, flex: 1 }}>
            Ajouter des exercices
          </ThemedText>
          <Button label="Fermer" variant="ghost" small onPress={close} />
        </Row>

        {form ? (
          <View style={[styles.form, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Nouvel exercice</ThemedText>
            <Input
              placeholder="Nom (ex. Développé machine)"
              value={form.name}
              onChangeText={(name) => setForm({ ...form, name })}
              autoFocus
            />
            <ThemedText type="small" themeColor="textSecondary">
              Muscle travaillé
            </ThemedText>
            <View style={styles.chips}>
              {MUSCLE_GROUPS.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setForm({ ...form, group: g })}
                  style={[styles.chip, { backgroundColor: g === form.group ? theme.accent : theme.backgroundSelected }]}>
                  <ThemedText type="small" style={g === form.group ? { color: theme.onAccent } : undefined}>
                    {g}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <Row>
              <Button label="Annuler" variant="secondary" small onPress={() => setForm(null)} />
              <Button label="Créer" small disabled={!form.name.trim() || !form.group} onPress={create} />
            </Row>
          </View>
        ) : (
          <>
            <Input placeholder="Rechercher…" value={query} onChangeText={setQuery} autoCorrect={false} />
            <Button
              label={q && !exactMatch ? `＋ Créer « ${query.trim()} »` : '＋ Nouvel exercice'}
              variant="secondary"
              small
              onPress={() => setForm({ name: q && !exactMatch ? query.trim() : '', group: null })}
            />
          </>
        )}

        <SectionList
          sections={sections}
          keyExtractor={(e) => String(e.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => {
            const rank = selected.findIndex((e) => e.id === item.id);
            return (
              <Pressable
                onPress={() => toggle(item)}
                style={({ pressed }) => [
                  styles.item,
                  { borderColor: theme.backgroundSelected, opacity: pressed ? 0.6 : 1 },
                ]}>
                <ThemedText style={{ flex: 1 }}>{item.name}</ThemedText>
                <View
                  style={[
                    styles.tick,
                    rank >= 0
                      ? { backgroundColor: theme.accent, borderColor: theme.accent }
                      : { borderColor: theme.backgroundSelected },
                  ]}>
                  {rank >= 0 && (
                    <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                      {rank + 1}
                    </ThemedText>
                  )}
                </View>
              </Pressable>
            );
          }}
        />

        {selected.length > 0 && (
          <Button
            label={`Ajouter ${selected.length > 1 ? `les ${selected.length} exercices` : 'l’exercice'}`}
            onPress={confirm}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, padding: 16, gap: 12 },
  header: { justifyContent: 'space-between' },
  form: { borderRadius: 12, padding: 12, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  sectionHeader: { textTransform: 'uppercase', marginTop: 16, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  tick: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
