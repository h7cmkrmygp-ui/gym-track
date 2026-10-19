import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { EXPORT_REMINDER_DAYS, shareBackup } from '@/backup';
import { Icon } from '@/components/icon';
import { ActivityRings } from '@/components/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Row, Screen, SectionTitle } from '@/components/ui';
import { RingColors } from '@/constants/theme';
import { currentVisit, listVisits, manualCheckIn } from '@/db/gyms';
import { getSettings } from '@/db/settings';
import { createPplPreset, getTemplate, listTemplates } from '@/db/templates';
import {
  deleteWorkout,
  finishWorkout,
  getActiveWorkout,
  lastRotationTemplateId,
  listFinishedWorkouts,
  startWorkout,
} from '@/db/workouts';
import { getGeofenceStatus } from '@/geofence/regions';
import { successHaptic } from '@/haptics';
import { useFocusData } from '@/hooks/use-focus-data';
import { useTheme } from '@/hooks/use-theme';
import { nextInRotation } from '@/logic/rotation';
import { attendanceDays, dayKey, daysThisWeek, weeklyStreak, weekTotals } from '@/logic/stats';
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
  const next = nextInRotation(templates, lastId);
  const nextTemplate = next ? await getTemplate(next.id) : null;
  return {
    settings,
    active,
    templates,
    next,
    nextExercises: nextTemplate?.exercises.map((e) => e.name) ?? [],
    date: new Date(now).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' }),
    visit: visit?.source === 'geofence' ? visit : null,
    wentToday: days.has(dayKey(now)),
    week: daysThisWeek(days, now),
    totals: weekTotals(workouts, now),
    streak: weeklyStreak(days, settings.weeklyGoal, now),
    geofence,
    // Nudge to export once there is something to lose and no recent copy off the phone.
    backupDue:
      workouts.length > 0 &&
      (settings.lastExportAt === null || now - settings.lastExportAt > EXPORT_REMINDER_DAYS * 86_400_000),
    lastExport: settings.lastExportAt === null ? null : relativeDay(settings.lastExportAt, now),
  };
}

/** One line of the rings' legend: a colored marker, the label and the value against the goal. */
function RingLegend({ color, label, value, goal, unit }: { color: string; label: string; value: number; goal: number; unit: string }) {
  return (
    <View style={styles.legend}>
      <Row style={{ gap: 6 }}>
        <View style={[styles.legendDot, { borderColor: color }]} />
        <ThemedText type="smallBold">{label}</ThemedText>
      </Row>
      <Row style={styles.legendValue}>
        <ThemedText type="number">
          {value}/{goal}
        </ThemedText>
        <ThemedText type="caps">{unit}</ThemedText>
      </Row>
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const [data, reload] = useFocusData(loadHome);
  if (!data) return <Screen>{null}</Screen>;

  const start = async (templateId: number | null) => {
    const id = await startWorkout(templateId);
    router.push(`/workout/${id}`);
  };

  const { settings, totals } = data;
  const others = data.templates.filter((t) => t.id !== data.next?.id);

  return (
    <Screen eyebrow={data.date}>
      <Card title="Activité" onPress={() => router.navigate('/progress')}>
        <Row style={styles.activity}>
          <ActivityRings
            size={148}
            stroke={18}
            rings={[
              { progress: data.week / settings.weeklyGoal, color: RingColors.days },
              { progress: totals.sets / settings.setsGoal, color: RingColors.sets },
              { progress: totals.minutes / settings.minutesGoal, color: RingColors.minutes },
            ]}
          />
          <View style={styles.legends}>
            <RingLegend color={RingColors.days} label="Jours" value={data.week} goal={settings.weeklyGoal} unit="j" />
            <RingLegend color={RingColors.sets} label="Séries" value={totals.sets} goal={settings.setsGoal} unit="séries" />
            <RingLegend
              color={RingColors.minutes}
              label="Minutes"
              value={totals.minutes}
              goal={settings.minutesGoal}
              unit="min"
            />
          </View>
        </Row>
      </Card>

      <Row style={styles.twoUp}>
        <Card title="Série" flex style={styles.half}>
          <Row style={{ gap: 6 }}>
            <Icon name="flame.fill" size={22} />
            <ThemedText type="number">{data.streak}</ThemedText>
          </Row>
          <ThemedText type="caps">{data.streak > 1 ? 'semaines de suite' : 'semaine de suite'}</ThemedText>
        </Card>
        <Card title="Aujourd'hui" flex style={styles.half}>
          {data.visit ? (
            <>
              <Icon name="mappin.circle.fill" size={24} />
              <ThemedText type="caps">À la salle depuis {time(data.visit.startAt)}</ThemedText>
            </>
          ) : data.wentToday ? (
            <>
              <Icon name="checkmark.seal.fill" size={24} />
              <ThemedText type="caps">Jour de gym noté</ThemedText>
            </>
          ) : (
            <Button
              label="J'y suis"
              icon="mappin"
              variant="secondary"
              small
              onPress={async () => {
                await manualCheckIn(Date.now());
                successHaptic();
                reload();
              }}
            />
          )}
        </Card>
      </Row>

      {data.active ? (
        <Card title="Séance en cours" titleColor={theme.accent}>
          <ThemedText type="subtitle">{data.active.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Commencée à {time(data.active.startedAt)}
          </ThemedText>
          <Button label="Reprendre" icon="play.fill" onPress={() => router.push(`/workout/${data.active!.id}`)} />
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
        <Card title="Ton split">
          <ThemedText type="small" themeColor="textSecondary">
            Prépare tes séances : l&apos;app te proposera la suivante à chaque fois.
          </ThemedText>
          <Button
            label="Split Push / Pull / Legs"
            onPress={async () => {
              await createPplPreset();
              reload();
            }}
          />
          <Button label="Créer une séance" icon="plus" variant="secondary" onPress={() => router.push('/template/new?start=1')} />
          <Button label="Séance libre" variant="ghost" onPress={() => start(null)} />
        </Card>
      ) : (
        data.next && (
          <Card title="Prochaine séance" onPress={() => router.push(`/template/${data.next!.id}`)}>
            <ThemedText type="title">{data.next.name}</ThemedText>
            {data.nextExercises.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {data.nextExercises.join(' · ')}
              </ThemedText>
            )}
            <Button label="Commencer" icon="play.fill" onPress={() => start(data.next!.id)} />
          </Card>
        )
      )}

      {!data.active && data.templates.length > 0 && (
        <>
          <SectionTitle>Autres séances</SectionTitle>
          <View style={styles.choices}>
            {others.map((t) => (
              <Chip key={t.id} label={t.name} icon="dumbbell.fill" onPress={() => start(t.id)} />
            ))}
            <Chip label="Séance libre" icon="bolt.fill" onPress={() => start(null)} />
            <Chip label="Créer" icon="plus" onPress={() => router.push('/template/new?start=1')} />
          </View>
        </>
      )}

      {data.geofence === 'needs-permission' || data.geofence === 'no-gyms' ? (
        <Card title="Détection d'arrivée" onPress={() => router.navigate('/settings')}>
          <ThemedText type="small" themeColor="textSecondary">
            {data.geofence === 'no-gyms'
              ? 'Ajoute ta salle pour que tes jours de gym soient notés tout seuls.'
              : 'Active la détection d’arrivée à la salle.'}
          </ThemedText>
        </Card>
      ) : null}

      {data.backupDue && (
        <Card title="Sauvegarde">
          <ThemedText type="small" themeColor="textSecondary">
            {data.lastExport ? `Dernier export : ${data.lastExport}.` : 'Tu n’as encore jamais exporté tes données.'}{' '}
            Si l&apos;app est supprimée, ton historique l&apos;est aussi.
          </ThemedText>
          <Button
            label="Exporter vers iCloud / OneDrive"
            icon="icloud.and.arrow.up"
            variant="secondary"
            onPress={async () => {
              await shareBackup();
              reload();
            }}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  activity: { gap: 18 },
  legends: { flex: 1, gap: 10 },
  legend: { gap: 0 },
  legendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 3 },
  legendValue: { gap: 4, alignItems: 'baseline' },
  twoUp: { alignItems: 'stretch' },
  half: { minHeight: 116 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
