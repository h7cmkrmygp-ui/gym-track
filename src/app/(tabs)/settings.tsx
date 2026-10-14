import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { listSnapshots, restoreFromFile, shareBackup } from '@/backup';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Row, Screen, SectionTitle, Segmented, Stepper } from '@/components/ui';
import { listGyms } from '@/db/gyms';
import { getSettings, setSetting } from '@/db/settings';
import { createPplPreset, listTemplates, moveInRotation } from '@/db/templates';
import { getGeofenceStatus, isExpoGo, requestAlwaysLocation, syncGeofences } from '@/geofence/regions';
import { handleGeofenceEvent } from '@/geofence/task';
import { useFocusData } from '@/hooks/use-focus-data';
import { useTheme } from '@/hooks/use-theme';
import type { Unit } from '@/logic/units';
import { relativeDay } from '@/logic/widget';
import { scheduleTimedNotifications } from '@/notifications/summary';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

async function loadSettings() {
  const [settings, templates, gyms, geofence] = await Promise.all([
    getSettings(),
    listTemplates(),
    listGyms(),
    getGeofenceStatus(),
  ]);
  return { settings, templates, gyms, geofence, snapshots: listSnapshots(), now: Date.now() };
}

export default function SettingsScreen() {
  const theme = useTheme();
  const [data, reload] = useFocusData(loadSettings);

  if (!data) return <Screen title="Réglages">{null}</Screen>;
  const { settings, templates, gyms, geofence, snapshots, now } = data;
  const rotation = templates.filter((t) => t.rotationOrder !== null);
  const others = templates.filter((t) => t.rotationOrder === null);

  const change = async <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    await setSetting(key, value);
    reload();
  };

  const enableDetection = async () => {
    const error = await requestAlwaysLocation();
    if (error) Alert.alert('Localisation « Toujours » requise', error);
    reload();
  };

  const exportData = async () => {
    await shareBackup();
    reload();
  };

  const restore = (uri: string, label: string) =>
    Alert.alert('Remplacer toutes tes données ?', `Elles seront remplacées par ${label}.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Remplacer',
        style: 'destructive',
        onPress: async () => {
          try {
            await restoreFromFile(uri);
            await syncGeofences();
            reload();
            Alert.alert('Sauvegarde restaurée');
          } catch (e) {
            Alert.alert('Restauration impossible', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);

  const importData = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (!result.canceled) restore(result.assets[0].uri, 'ce fichier');
  };

  const toggleSummary = async (on: boolean) => {
    await setSetting('weeklySummary', on);
    await scheduleTimedNotifications();
    reload();
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
              'no-gyms': '✅ Localisation autorisée. Ajoute ta salle ci-dessous.',
              active: `✅ Détection active pour ${gyms.length} ${gyms.length > 1 ? 'salles' : 'salle'}.`,
            }[geofence]
          }
        </ThemedText>
        {geofence === 'needs-permission' && <Button label="Activer la détection" onPress={enableDetection} />}

        {gyms.map((g) => (
          <View key={g.id} style={styles.gym}>
            <Pressable onPress={() => router.push(`/gym/${g.id}`)}>
              <Row style={styles.between}>
                <ThemedText style={{ fontWeight: 700, flex: 1 }}>📍 {g.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {g.radiusM} m ›
                </ThemedText>
              </Row>
            </Pressable>
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

        <Button label="+ Ajouter une salle" variant="secondary" onPress={() => router.push('/gym/new')} />
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
        <Row style={styles.between}>
          <View style={{ flex: 1 }}>
            <ThemedText type="small">Bilan du dimanche</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Notification à 19 h avec tes séances, séries et records de la semaine.
            </ThemedText>
          </View>
          <Switch value={settings.weeklySummary} onValueChange={toggleSummary} trackColor={{ true: theme.accent }} />
        </Row>
        <Row style={styles.between}>
          <View style={{ flex: 1 }}>
            <ThemedText type="small">Rappel si pas de gym depuis</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Notification à 18 h quand ça fait trop longtemps.
            </ThemedText>
          </View>
          <Stepper
            value={settings.inactivityDays}
            min={0}
            max={7}
            format={(v) => (v === 0 ? 'Jamais' : `${v} j`)}
            onChange={async (v) => {
              await setSetting('inactivityDays', v);
              await scheduleTimedNotifications();
              reload();
            }}
          />
        </Row>
      </Card>

      <SectionTitle>Sauvegarde</SectionTitle>
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Tes données sont seulement sur ce téléphone : si l&apos;app est supprimée, elles le sont aussi. Exporte une
          sauvegarde vers iCloud Drive ou OneDrive pour la mettre à l&apos;abri.
        </ThemedText>
        <ThemedText type="smallBold">
          Dernier export :{' '}
          {settings.lastExportAt ? relativeDay(settings.lastExportAt, now) : 'jamais'}
        </ThemedText>
        <Button label="Exporter mes données" onPress={exportData} />
        <Button label="Importer une sauvegarde" variant="ghost" onPress={importData} />
      </Card>

      {snapshots.length > 0 && (
        <>
          <SectionTitle>Sauvegardes automatiques</SectionTitle>
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              Une copie chaque semaine dans l&apos;app (les 8 dernières), pour revenir en arrière après une erreur.
            </ThemedText>
            {snapshots.map((s) => (
              <Row key={s.name} style={styles.between}>
                <ThemedText type="small">{s.date}</ThemedText>
                <Button label="Restaurer" variant="ghost" small onPress={() => restore(s.uri, `la sauvegarde du ${s.date}`)} />
              </Row>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gym: { gap: 6, paddingVertical: 8 },
  between: { justifyContent: 'space-between' },
});
