import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { EXPORT_REMINDER_DAYS, shareBackup } from '@/backup';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Row, Screen, SectionTitle } from '@/components/ui';
import { currentVisit, listVisits, manualCheckIn } from '@/db/gyms';
import { getSettings } from '@/db/settings';
import { createPplPreset, listTemplates } from '@/db/templates';
import {
  deleteWorkout,
  finishWorkout,
  getActiveWorkout,
  lastRotationTemplateId,
  listFinishedWorkouts,
  startWorkout,
} from '@/db/workouts';
import { getGeofenceStatus } from '@/geofence/regions';
import { useFocusData } from '@/hooks/use-focus-data';
import { useTheme } from '@/hooks/use-theme';
import { nextInRotation } from '@/logic/rotation';
import { attendanceDays, dayKey, daysThisWeek, weeklyStreak } from '@/logic/stats';
import { relativeDay } from '@/logic/widget';

const time = (ts: number) => new Date(ts).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

async function loadHome() {
  const [settings, active, templates, lastId, visit, visits, workouts, geofence] = await Promise.all([
    getSettings(),
    getActiveWorkout(),
    listTemplates(),
    lastRotationTemplateId(),
    currentVisit(),
    listVisits(),
    listFinishedWorkouts(),
    getGeofenceStatus(),
  ]);
  const now = Date.now();
  const days = attendanceDays(visits, workouts.map((w) => w.startedAt), now);
  return {
    settings,
    active,
    templates,
    next: nextInRotation(templates, lastId),
    visit: visit?.source === 'geofence' ? visit : null,
    wentToday: days.has(dayKey(now)),
    week: daysThisWeek(days, now),
    streak: weeklyStreak(days, settings.weeklyGoal, now),
    geofence,
    // Nudge to export once there is something to lose and no recent copy off the phone.
    backupDue:
      workouts.length > 0 &&
      (settings.lastExportAt === null || now - settings.lastExportAt > EXPORT_REMINDER_DAYS * 86_400_000),
    lastExport: settings.lastExportAt === null ? null : relativeDay(settings.lastExportAt, now),
  };
}

export default function HomeScreen() {
  const theme = useTheme();
  const [data, reload] = useFocusData(loadHome);
  if (!data) return <Screen title="GymTrack">{null}</Screen>;

  const start = async (templateId: number | null) => {
    const id = await startWorkout(templateId);
    router.push(`/workout/${id}`);
  };

  const others = data.templates.filter((t) => t.id !== data.next?.id);

  return (
    <Screen title="GymTrack">
      {data.backupDue && (
        <Card>
          <ThemedText type="smallBold">💾 Mets ta progression à l&apos;abri</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {data.lastExport ? `Dernier export : ${data.lastExport}.` : 'Tu n’as encore jamais exporté tes données.'}{' '}
            Si l&apos;app est supprimée, tout ton historique l&apos;est aussi.
          </ThemedText>
          <Button
            label="Exporter vers iCloud / OneDrive"
            small
            onPress={async () => {
              await shareBackup();
              reload();
            }}
          />
        </Card>
      )}
      <Card>
        {data.visit ? (
          <ThemedText>
            📍 À {data.visit.gymName ?? 'la salle'} depuis {time(data.visit.startAt)}
          </ThemedText>
        ) : data.wentToday ? (
          <ThemedText>✅ Jour de gym enregistré</ThemedText>
        ) : (
          <>
            <ThemedText>Pas encore au gym aujourd&apos;hui.</ThemedText>
            <Button
              label="Je suis à la salle"
              variant="secondary"
              onPress={async () => {
                await manualCheckIn(Date.now());
                reload();
              }}
            />
          </>
        )}
        <Row style={styles.stats}>
          <View style={styles.stat}>
            <ThemedText type="subtitle" style={{ color: theme.accent }}>
              {data.week}/{data.settings.weeklyGoal}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              jours cette semaine
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText type="subtitle" style={{ color: theme.accent }}>
              {data.streak}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {data.streak > 1 ? 'semaines de suite' : 'semaine de suite'}
            </ThemedText>
          </View>
        </Row>
      </Card>

      {data.geofence === 'needs-permission' || data.geofence === 'no-gyms' ? (
        <Card>
          <ThemedText type="small">
            {data.geofence === 'no-gyms'
              ? 'Ajoute ta salle dans Réglages pour que tes jours de gym soient notés automatiquement.'
              : 'Active la détection d’arrivée à la salle dans Réglages.'}
          </ThemedText>
          <Button label="Ouvrir les réglages" variant="ghost" small onPress={() => router.navigate('/settings')} />
        </Card>
      ) : null}

      {data.active ? (
        <Card>
          <SectionTitle>Séance en cours</SectionTitle>
          <ThemedText type="subtitle">{data.active.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Commencée à {time(data.active.startedAt)}
          </ThemedText>
          <Button label="Reprendre" onPress={() => router.push(`/workout/${data.active!.id}`)} />
          <Row>
            <Button
              label="Terminer"
              variant="secondary"
              small
              style={{ flex: 1 }}
              onPress={() =>
                Alert.alert('Terminer la séance ?', 'Seules les séries cochées sont gardées.', [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Terminer',
                    onPress: async () => {
                      await finishWorkout(data.active!.id);
                      reload();
                    },
                  },
                ])
              }
            />
            <Button
              label="Abandonner"
              variant="danger"
              small
              style={{ flex: 1 }}
              onPress={() =>
                Alert.alert('Abandonner la séance ?', 'Toutes ses séries seront effacées.', [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Abandonner',
                    style: 'destructive',
                    onPress: async () => {
                      await deleteWorkout(data.active!.id);
                      reload();
                    },
                  },
                ])
              }
            />
          </Row>
        </Card>
      ) : data.templates.length === 0 ? (
        <Card>
          <SectionTitle>Ton split</SectionTitle>
          <ThemedText>Crée tes séances pour que l&apos;app te propose la suivante à chaque fois.</ThemedText>
          <Button
            label="Ajouter un split Push / Pull / Legs"
            onPress={async () => {
              await createPplPreset();
              reload();
            }}
          />
          <Button label="＋ Créer une séance" variant="secondary" onPress={() => router.push('/template/new?start=1')} />
          <Button label="Séance libre" variant="ghost" onPress={() => start(null)} />
        </Card>
      ) : (
        <>
          {data.next && (
            <Card>
              <SectionTitle>Prochaine séance</SectionTitle>
              <ThemedText type="subtitle">{data.next.name}</ThemedText>
              <Button label={`Commencer ${data.next.name}`} onPress={() => start(data.next!.id)} />
            </Card>
          )}
          <SectionTitle>Autre séance</SectionTitle>
          <View style={styles.choices}>
            {others.map((t) => (
              <Button key={t.id} label={t.name} variant="secondary" small onPress={() => start(t.id)} />
            ))}
            <Button label="Séance libre" variant="secondary" small onPress={() => start(null)} />
          </View>
          <Button label="＋ Créer une séance" variant="secondary" onPress={() => router.push('/template/new?start=1')} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { marginTop: 8 },
  stat: { flex: 1 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
