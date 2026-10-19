import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/backdrop';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Button, Chip, IconButton, Input, Row } from '@/components/ui';
import { Gold } from '@/constants/theme';
import { selectHaptic } from '@/haptics';
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
  const toggle = (exercise: Exercise) => {
    selectHaptic();
    setSelected((list) =>
      list.some((e) => e.id === exercise.id) ? list.filter((e) => e.id !== exercise.id) : [...list, exercise],
    );
  };

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
        <Backdrop />
        <Row style={styles.header}>
          <ThemedText type="subtitle" style={{ flex: 1 }}>
            Exercices
          </ThemedText>
          <IconButton icon="xmark" onPress={close} />
        </Row>

        {form ? (
          <Animated.View
            entering={FadeInDown.duration(250)}
            style={[styles.form, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
            <ThemedText type="caps">Nouvel exercice</ThemedText>
            <Input
              placeholder="Nom (ex. Développé machine)"
              value={form.name}
              onChangeText={(name) => setForm({ ...form, name })}
              autoFocus
            />
            <ThemedText type="caps" themeColor="textSecondary">
              Muscle travaillé
            </ThemedText>
            <View style={styles.chips}>
              {MUSCLE_GROUPS.map((g) => (
                <Chip key={g} label={g} selected={g === form.group} onPress={() => setForm({ ...form, group: g })} />
              ))}
            </View>
            <Row>
              <Button label="Annuler" variant="secondary" small onPress={() => setForm(null)} />
              <Button label="Créer" icon="plus" small disabled={!form.name.trim() || !form.group} onPress={create} />
            </Row>
          </Animated.View>
        ) : (
          <>
            <View>
              <Input
                placeholder="Rechercher"
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                style={styles.search}
              />
              <Icon name="magnifyingglass" size={14} color={theme.textSecondary} style={styles.searchIcon} />
            </View>
            <Button
              icon="plus"
              label={q && !exactMatch ? `Créer « ${query.trim()} »` : 'Nouvel exercice'}
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
            <ThemedText type="caps" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => {
            const rank = selected.findIndex((e) => e.id === item.id);
            return (
              <Pressable
                onPress={() => toggle(item)}
                style={({ pressed }) => [styles.item, { borderColor: theme.hairline, opacity: pressed ? 0.6 : 1 }]}>
                <ThemedText style={{ flex: 1, color: rank >= 0 ? theme.accent : theme.text }}>{item.name}</ThemedText>
                <View style={[styles.tick, { borderColor: rank >= 0 ? 'transparent' : theme.hairline }]}>
                  {rank >= 0 && (
                    <Animated.View entering={ZoomIn.springify().damping(12)} style={StyleSheet.absoluteFill}>
                      <LinearGradient colors={Gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tickFill}>
                        <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                          {rank + 1}
                        </ThemedText>
                      </LinearGradient>
                    </Animated.View>
                  )}
                </View>
              </Pressable>
            );
          }}
        />

        {selected.length > 0 && (
          <Animated.View entering={FadeInDown.springify().damping(18)}>
            <Button
              icon="checkmark"
              label={`Ajouter ${selected.length > 1 ? `les ${selected.length} exercices` : 'l’exercice'}`}
              onPress={confirm}
            />
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, padding: 18, gap: 12 },
  header: { justifyContent: 'space-between' },
  form: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sectionHeader: { marginTop: 18, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1 },
  tick: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tickFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  search: { paddingLeft: 36 },
  searchIcon: { position: 'absolute', left: 13, top: 14 },
});
