import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Input, Row, Screen, SectionTitle, Segmented, Stepper } from '@/components/ui';
import { exportBackup, importBackup } from '@/db/backup';
import { addGym, deleteGym, listGyms, updateGymRadius } from '@/db/gyms';
import { getSettings, setSetting } from '@/db/settings';
import { createPplPreset, listTemplates, moveInRotation } from '@/db/templates';
import { getCurrentCoords, getGeofenceStatus, isExpoGo, requestAlwaysLocation, syncGeofences } from '@/geofence/regions';
import { handleGeofenceEvent } from '@/geofence/task';
import { useFocusData } from '@/hooks/use-focus-data';
import { dayKey } from '@/logic/stats';
import type { Unit } from '@/logic/units';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

async function loadSettings() {
  const [settings, templates, gyms, geofence] = await Promise.all([
    getSettings(),
    listTemplates(),
    listGyms(),
    getGeofenceStatus(),
  ]);
  return { settings, templates, gyms, geofence };
}

export default function SettingsScreen() {
  const [data, reload] = useFocusData(loadSettings);
  const [gymName, setGymName] = useState('');
  const [adding, setAdding] = useState(false);

  if (!data) return <Screen title="Réglages">{null}</Screen>;
  const { settings, templates, gyms, geofence } = data;
  const rotation = templates.filter((t) => t.rotationOrder !== null);
  const others = templates.filter((t) => t.rotationOrder === null);

  const change = async <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    await setSetting(key, value);
    reload();
  };

  const addCurrentPlace = async () => {
    setAdding(true);
    try {
      const coords = await getCurrentCoords();
      if (typeof coords === 'string') {
        Alert.alert('Localisation', coords);
        return;
      }
      await addGym(gymName.trim() || 'Ma salle', coords.lat, coords.lng);
      setGymName('');
      await syncGeofences();
      reload();
    } catch (e) {
      Alert.alert('Position introuvable', String(e));
    } finally {
      setAdding(false);
    }
  };

  const enableDetection = async () => {
    const error = await requestAlwaysLocation();
    if (error) Alert.alert('Localisation « Toujours » requise', error);
    reload();
  };

  const exportData = async () => {
    const file = new File(Paths.cache, `gymtrack-${dayKey(Date.now())}.json`);
    file.create({ overwrite: true });
    file.write(JSON.stringify(await exportBackup()));
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
  };

  const importData = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (result.canceled) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await new File(result.assets[0].uri).text());
    } catch {
      Alert.alert('Fichier illisible', 'Choisis un fichier exporté depuis GymTrack.');
      return;
    }
    Alert.alert('Remplacer toutes tes données ?', 'Les données actuelles seront remplacées par la sauvegarde.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Remplacer',
        style: 'destructive',
        onPress: async () => {
          try {
            await importBackup(parsed);
            await syncGeofences();
            reload();
            Alert.alert('Sauvegarde restaurée');
          } catch (e) {
            Alert.alert('Import impossible', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  };

  return (
    <Screen title="Réglages">
      <SectionTitle>Mon split</SectionTitle>
      <Card>
        {rotation.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Aucune séance dans la rotation.
          </ThemedText>
        )}
        {rotation.map((t, i) => (
          <Row key={t.id}>
            <Pressable style={{ flex: 1 }} onPress={() => router.push(`/template/${t.id}`)}>
              <ThemedText>
                {i + 1}. {t.name}
              </ThemedText>
            </Pressable>
            <Button
              label="↑"
              variant="ghost"
              small
              disabled={i === 0}
              onPress={async () => {
                await moveInRotation(t.id, -1);
                reload();
              }}
            />
            <Button
              label="↓"
              variant="ghost"
              small
              disabled={i === rotation.length - 1}
              onPress={async () => {
                await moveInRotation(t.id, 1);
                reload();
              }}
            />
          </Row>
        ))}
        {others.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 8 }}>
            Hors rotation
          </ThemedText>
        )}
        {others.map((t) => (
          <Pressable key={t.id} onPress={() => router.push(`/template/${t.id}`)}>
            <ThemedText>{t.name}</ThemedText>
          </Pressable>
        ))}
        <Button label="+ Nouvelle séance" variant="secondary" small onPress={() => router.push('/template/new')} />
        {templates.length === 0 && (
          <Button
            label="Ajouter un split Push / Pull / Legs"
            small
            onPress={async () => {
              await createPplPreset();
              reload();
            }}
          />
        )}
      </Card>

      <SectionTitle>Salles et détection d&apos;arrivée</SectionTitle>
      <Card>
        <ThemedText type="small">
          {
            {
              'expo-go':
                'ℹ️ Dans Expo Go, la détection automatique est désactivée. Elle marche dans la version installée avec AltStore.',
              'needs-permission':
                'La détection a besoin de ta localisation « Toujours » pour noter tes jours de gym même quand l’app est fermée.',
              'no-gyms': '✅ Localisation autorisée. Ajoute ta salle quand tu es dedans.',
              active: `✅ Détection active pour ${gyms.length} ${gyms.length > 1 ? 'salles' : 'salle'}.`,
            }[geofence]
          }
        </ThemedText>
        {geofence === 'needs-permission' && <Button label="Activer la détection" onPress={enableDetection} />}

        {gyms.map((g) => (
          <View key={g.id} style={styles.gym}>
            <Row style={styles.between}>
              <ThemedText style={{ fontWeight: 700, flex: 1 }}>📍 {g.name}</ThemedText>
              <Button
                label="Supprimer"
                variant="danger"
                small
                onPress={() =>
                  Alert.alert(`Supprimer ${g.name} ?`, 'Tes jours de gym déjà notés restent.', [
                    { text: 'Annuler', style: 'cancel' },
                    {
                      text: 'Supprimer',
                      style: 'destructive',
                      onPress: async () => {
                        await deleteGym(g.id);
                        await syncGeofences();
                        reload();
                      },
                    },
                  ])
                }
              />
            </Row>
            <Row style={styles.between}>
              <ThemedText type="small">Rayon</ThemedText>
              <Stepper
                value={g.radiusM}
                min={50}
                max={300}
                step={25}
                format={(v) => `${v} m`}
                onChange={async (v) => {
                  await updateGymRadius(g.id, v);
                  await syncGeofences();
                  reload();
                }}
              />
            </Row>
            {isExpoGo && (
              <Row>
                <Button
                  label="Simuler arrivée"
                  variant="secondary"
                  small
                  onPress={() => handleGeofenceEvent(g.id, Location.GeofencingEventType.Enter).then(reload)}
                />
                <Button
                  label="Simuler départ"
                  variant="secondary"
                  small
                  onPress={() => handleGeofenceEvent(g.id, Location.GeofencingEventType.Exit).then(reload)}
                />
              </Row>
            )}
          </View>
        ))}

        <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 8 }}>
          Ajouter une salle (sois dedans ou juste devant)
        </ThemedText>
        <Input placeholder="Nom (ex. Énergie Cardio)" value={gymName} onChangeText={setGymName} />
        <Button
          label={adding ? 'Localisation…' : 'Ajouter ma position actuelle'}
          variant="secondary"
          disabled={adding}
          onPress={addCurrentPlace}
        />
      </Card>

      <SectionTitle>Unités</SectionTitle>
      <Segmented<Unit>
        value={settings.unit}
        onChange={(v) => change('unit', v)}
        options={[
          { value: 'lbs', label: 'Livres (lbs)' },
          { value: 'kg', label: 'Kilos (kg)' },
        ]}
      />

      <SectionTitle>Séances</SectionTitle>
      <Card>
        <Row style={styles.between}>
          <ThemedText type="small">Repos par défaut</ThemedText>
          <Stepper
            value={settings.restDefaultS}
            min={15}
            max={600}
            step={15}
            format={mmss}
            onChange={(v) => change('restDefaultS', v)}
          />
        </Row>
        <Row style={styles.between}>
          <ThemedText type="small">Objectif par semaine</ThemedText>
          <Stepper
            value={settings.weeklyGoal}
            min={1}
            max={7}
            format={(v) => `${v} j`}
            onChange={(v) => change('weeklyGoal', v)}
          />
        </Row>
      </Card>

      <SectionTitle>Sauvegarde</SectionTitle>
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Tes données sont seulement sur ce téléphone. Si l&apos;app est supprimée, elles le sont aussi : exporte
          une sauvegarde de temps en temps (vers Fichiers ou iCloud Drive).
        </ThemedText>
        <Button label="Exporter mes données" variant="secondary" onPress={exportData} />
        <Button label="Importer une sauvegarde" variant="ghost" onPress={importData} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gym: { gap: 6, paddingVertical: 8 },
  between: { justifyContent: 'space-between' },
});
