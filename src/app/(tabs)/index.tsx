import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { EXPORT_REMINDER_DAYS, shareBackup } from '@/backup';
import { Icon } from '@/components/icon';
import { ProgressRing } from '@/components/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Row, Screen, SectionTitle } from '@/components/ui';
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
import { attendanceDays, dayKey, daysThisWeek, weeklyStreak } from '@/logic/stats';
import { relativeDay } from '@/logic/widget';

const time = (ts: number) => new Date(ts).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });

function greeting(now: number) {
  const hour = new Date(now).getHours();
  if (hour < 5) return 'Bonne nuit';
  if (hour < 18) return 'Bonjour';
  return 'Bonsoir';
}

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
    greeting: greeting(now),
    date: new Date(now).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' }),
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
  if (!data) return <Screen title=" ">{null}</Screen>;

  const start = async (templateId: number | null) => {
    const id = await startWorkout(templateId);
    router.push(`/workout/${id}`);
  };

  const others = data.templates.filter((t) => t.id !== data.next?.id);
  const goal = data.settings.weeklyGoal;
  let card = 1;

  return (
    <Screen eyebrow={data.date} title={data.greeting}>
      <Card glow index={0}>
        <Row style={styles.hero}>
          <ProgressRing progress={Math.min(1, data.week / goal)} size={124} stroke={10}>
            <View style={styles.ringCenter}>
              <ThemedText type="hero" style={{ color: theme.accent }}>
                {data.week}
              </ThemedText>
              <ThemedText type="caps" themeColor="textSecondary">
                sur {goal}
              </ThemedText>
            </View>
          </ProgressRing>
          <View style={styles.heroSide}>
            <ThemedText type="caps">Cette semaine</ThemedText>
            <Row style={{ gap: 6 }}>
              <Icon name="flame.fill" size={22} />
              <ThemedText type="subtitle">{data.streak}</ThemedText>
            </Row>
            <ThemedText type="small" themeColor="textSecondary">
              {data.streak > 1 ? 'semaines de suite' : 'semaine de suite'}
            </ThemedText>
          </View>
        </Row>
        <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
        {data.visit ? (
          <Row>
            <Icon name="mappin.circle.fill" size={18} />
            <ThemedText type="small">
              À {data.visit.gymName ?? 'la salle'} depuis {time(data.visit.startAt)}
            </ThemedText>
          </Row>
        ) : data.wentToday ? (
          <Row>
            <Icon name="checkmark.seal.fill" size={18} />
            <ThemedText type="small">Jour de gym enregistré</ThemedText>
          </Row>
        ) : (
          <Row style={styles.between}>
            <ThemedText type="small" themeColor="textSecondary">
              Pas encore au gym aujourd&apos;hui
            </ThemedText>
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
          </Row>
        )}
      </Card>

      {data.active ? (
        <Card index={card++}>
          <ThemedText type="caps">Séance en cours</ThemedText>
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
        <Card index={card++}>
          <Row>
            <Icon name="sparkles" size={18} />
            <ThemedText type="caps">Ton split</ThemedText>
          </Row>
          <ThemedText type="subtitle">Prépare tes séances</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            L&apos;app te proposera la suivante à chaque fois.
          </ThemedText>
          <Button
            label="Split Push / Pull / Legs"
            icon="square.stack.3d.up.fill"
            onPress={async () => {
              await createPplPreset();
              reload();
            }}
          />
          <Button
            label="Créer une séance"
            icon="plus"
            variant="secondary"
            onPress={() => router.push('/template/new?start=1')}
          />
          <Button label="Séance libre" variant="ghost" onPress={() => start(null)} />
        </Card>
      ) : (
        <>
          {data.next && (
            <Card index={card++}>
              <ThemedText type="caps">Prochaine séance</ThemedText>
              <ThemedText type="title">{data.next.name}</ThemedText>
              {data.nextExercises.length > 0 && (
                <View style={styles.exerciseList}>
                  {data.nextExercises.slice(0, 4).map((name, i) => (
                    <Row key={`${name}-${i}`} style={{ gap: 10 }}>
                      <View style={[styles.dot, { backgroundColor: theme.accent }]} />
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {name}
                      </ThemedText>
                    </Row>
                  ))}
                  {data.nextExercises.length > 4 && (
                    <ThemedText type="small" themeColor="textSecondary" style={{ marginLeft: 16 }}>
                      + {data.nextExercises.length - 4} autres
                    </ThemedText>
                  )}
                </View>
              )}
              <Button label="Commencer" icon="play.fill" onPress={() => start(data.next!.id)} />
            </Card>
          )}
          <SectionTitle>Autre séance</SectionTitle>
          <View style={styles.choices}>
            {others.map((t) => (
              <Chip key={t.id} label={t.name} icon="dumbbell.fill" onPress={() => start(t.id)} />
            ))}
            <Chip label="Séance libre" icon="bolt.fill" onPress={() => start(null)} />
            <Chip label="Créer une séance" icon="plus" onPress={() => router.push('/template/new?start=1')} />
          </View>
        </>
      )}

      {data.geofence === 'needs-permission' || data.geofence === 'no-gyms' ? (
        <Card index={card++} onPress={() => router.navigate('/settings')}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon name="location.circle.fill" size={20} />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="smallBold">Détection d&apos;arrivée</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {data.geofence === 'no-gyms'
                  ? 'Ajoute ta salle pour que tes jours de gym soient notés tout seuls.'
                  : 'Active la détection d’arrivée à la salle.'}
              </ThemedText>
            </View>
            <Icon name="chevron.right" size={12} color={theme.textSecondary} />
          </Row>
        </Card>
      ) : null}

      {data.backupDue && (
        <Card index={card++}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Icon name="icloud.and.arrow.up.fill" size={20} />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText type="smallBold">Mets ta progression à l&apos;abri</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {data.lastExport ? `Dernier export : ${data.lastExport}.` : 'Tu n’as encore jamais exporté tes données.'}{' '}
                Si l&apos;app est supprimée, ton historique l&apos;est aussi.
              </ThemedText>
            </View>
          </Row>
          <Button
            label="Exporter vers iCloud / OneDrive"
            variant="secondary"
            small
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
  hero: { gap: 20 },
  ringCenter: { alignItems: 'center' },
  heroSide: { flex: 1, gap: 4 },
  divider: { height: 1, marginVertical: 2 },
  between: { justifyContent: 'space-between' },
  exerciseList: { gap: 6, marginVertical: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, opacity: 0.8 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
