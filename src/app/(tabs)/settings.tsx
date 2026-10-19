import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { listSnapshots, restoreFromFile, shareBackup } from '@/backup';
import { Icon, type SFSymbol } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, IconButton, Row, Screen, SectionTitle, Segmented, Stepper } from '@/components/ui';
import { listGyms } from '@/db/gyms';
import { getSettings, setSetting } from '@/db/settings';
import { createPplPreset, listTemplates, moveInRotation } from '@/db/templates';
import { getGeofenceStatus, isExpoGo, requestAlwaysLocation, syncGeofences } from '@/geofence/regions';
import { handleGeofenceEvent } from '@/geofence/task';
import { tapHaptic } from '@/haptics';
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

  const geofenceText = {
    'expo-go': 'Dans Expo Go, la détection est désactivée. Elle marche dans la version AltStore.',
    'needs-permission': 'Autorise la localisation « Toujours » pour noter tes jours de gym, même app fermée.',
    'no-gyms': 'Localisation autorisée. Ajoute ta salle ci-dessous.',
    active: `Détection active pour ${gyms.length} ${gyms.length > 1 ? 'salles' : 'salle'}.`,
  }[geofence];

  return (
    <Screen eyebrow="Ton app" title="Réglages">
      <SectionTitle>Mon split</SectionTitle>
      <Card index={0} style={styles.group}>
        {rotation.length === 0 && others.length === 0 && (
          <SettingRow
            first
            icon="square.stack.3d.up"
            title="Aucune séance"
            subtitle="Crée ton split pour que l’app te propose la suivante."
          />
        )}
        {rotation.map((t, i) => (
          <SettingRow
            key={t.id}
            first={i === 0}
            icon={`${i + 1}.circle.fill` as SFSymbol}
            title={t.name}
            subtitle="Dans la rotation"
            onPress={() => router.push(`/template/${t.id}`)}>
            <IconButton
              icon="chevron.up"
              disabled={i === 0}
              onPress={async () => {
                await moveInRotation(t.id, -1);
                reload();
              }}
            />
            <IconButton
              icon="chevron.down"
              disabled={i === rotation.length - 1}
              onPress={async () => {
                await moveInRotation(t.id, 1);
                reload();
              }}
            />
          </SettingRow>
        ))}
        {others.map((t, i) => (
          <SettingRow
            key={t.id}
            first={rotation.length === 0 && i === 0}
            icon="dumbbell"
            title={t.name}
            subtitle="Hors rotation"
            onPress={() => router.push(`/template/${t.id}`)}
          />
        ))}
        <View style={styles.groupActions}>
          <Button
            label="Nouvelle séance"
            icon="plus"
            variant="secondary"
            small
            onPress={() => router.push('/template/new')}
          />
          {templates.length === 0 && (
            <Button
              label="Split Push / Pull / Legs"
              small
              onPress={async () => {
                await createPplPreset();
                reload();
              }}
            />
          )}
        </View>
      </Card>

      <SectionTitle>Salles et détection</SectionTitle>
      <Card index={1} style={styles.group}>
        <SettingRow
          first
          icon={geofence === 'active' ? 'location.fill' : 'location'}
          title="Détection d’arrivée"
          subtitle={geofenceText}>
          {geofence === 'needs-permission' && <Button label="Activer" small onPress={enableDetection} />}
        </SettingRow>
        {gyms.map((g) => (
          <View key={g.id}>
            <SettingRow
              icon="mappin.circle.fill"
              title={g.name}
              subtitle={`Zone de ${g.radiusM} m`}
              onPress={() => router.push(`/gym/${g.id}`)}
            />
            {isExpoGo && (
              <Row style={styles.simulate}>
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
        <View style={styles.groupActions}>
          <Button label="Ajouter une salle" icon="plus" variant="secondary" small onPress={() => router.push('/gym/new')} />
        </View>
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

      <SectionTitle>Séances et rappels</SectionTitle>
      <Card index={2} style={styles.group}>
        <SettingRow first icon="timer" title="Repos par défaut">
          <Stepper
            value={settings.restDefaultS}
            min={15}
            max={600}
            step={15}
            format={mmss}
            onChange={(v) => change('restDefaultS', v)}
          />
        </SettingRow>
        <SettingRow icon="target" title="Objectif par semaine">
          <Stepper
            value={settings.weeklyGoal}
            min={1}
            max={7}
            format={(v) => `${v} j`}
            onChange={(v) => change('weeklyGoal', v)}
          />
        </SettingRow>
        <SettingRow icon="calendar.badge.clock" title="Bilan du dimanche" subtitle="Notification à 19 h">
          <Switch value={settings.weeklySummary} onValueChange={toggleSummary} trackColor={{ true: theme.accent }} />
        </SettingRow>
        <SettingRow icon="bell.badge" title="Rappel d’inactivité" subtitle="À 18 h après ce nombre de jours">
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
        </SettingRow>
      </Card>

      <SectionTitle>Sauvegarde</SectionTitle>
      <Card index={3} style={styles.group}>
        <SettingRow
          first
          icon="icloud.and.arrow.up"
          title="Exporter mes données"
          subtitle={`Dernier export : ${settings.lastExportAt ? relativeDay(settings.lastExportAt, now) : 'jamais'}`}
          onPress={exportData}
        />
        <SettingRow
          icon="square.and.arrow.down"
          title="Importer une sauvegarde"
          subtitle="Remplace toutes les données"
          onPress={importData}
        />
        {snapshots.map((s) => (
          <SettingRow
            key={s.name}
            icon="clock.arrow.circlepath"
            title={`Copie auto du ${s.date}`}
            subtitle="Restaurer cette copie"
            onPress={() => restore(s.uri, `la copie du ${s.date}`)}
          />
        ))}
      </Card>
      <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
        Tes données restent sur ce téléphone. Exporte-les vers iCloud Drive ou OneDrive pour les mettre à
        l&apos;abri ; l&apos;app garde aussi une copie automatique par semaine (les 8 dernières).
      </ThemedText>
    </Screen>
  );
}

/** One line of a grouped settings card: icon tile, title, detail and a control or a chevron. */
function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  first,
  children,
}: {
  icon: SFSymbol;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  first?: boolean;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const body = (
    <Row style={[styles.settingRow, !first && { borderTopWidth: 1, borderTopColor: theme.hairline }]}>
      <View style={[styles.tile, { borderColor: theme.hairline }]}>
        <Icon name={icon} size={15} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <ThemedText type="small" style={{ fontWeight: 600 }} numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {children}
      {onPress && !children && <Icon name="chevron.right" size={11} color={theme.textSecondary} />}
    </Row>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { paddingVertical: 4, paddingHorizontal: 14, gap: 0 },
  groupActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 },
  settingRow: { gap: 12, paddingVertical: 12 },
  tile: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: 13, lineHeight: 17 },
  simulate: { paddingBottom: 10, paddingLeft: 46 },
  footnote: { textAlign: 'center', paddingHorizontal: 12, fontSize: 12, lineHeight: 17 },
});
