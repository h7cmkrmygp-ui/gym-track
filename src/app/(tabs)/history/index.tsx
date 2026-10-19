import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { MonthCalendar } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { Card, Row, Screen, SectionTitle } from '@/components/ui';
import { listGyms, listVisits } from '@/db/gyms';
import { listFinishedWorkouts, type WorkoutSummary } from '@/db/workouts';
import { useFocusData } from '@/hooks/use-focus-data';
import { useTheme } from '@/hooks/use-theme';
import { attendanceDays, dayKey } from '@/logic/stats';
import { isCountedVisit } from '@/logic/visits';

const time = (ts: number) => new Date(ts).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
const longDate = (ts: number) =>
  new Date(ts).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });

async function loadHistory() {
  const [visits, workouts, gyms] = await Promise.all([listVisits(), listFinishedWorkouts(), listGyms()]);
  const now = Date.now();
  return {
    today: dayKey(now),
    days: attendanceDays(visits, workouts.map((w) => w.startedAt), now),
    visits: visits.filter((v) => isCountedVisit(v, now)),
    workouts,
    gymNames: new Map(gyms.map((g) => [g.id, g.name])),
  };
}

export default function HistoryScreen() {
  const theme = useTheme();
  const [data] = useFocusData(loadHistory);
  const [month, setMonth] = useState(() => Date.now());
  const [selected, setSelected] = useState<string | null>(() => dayKey(Date.now()));

  if (!data) return <Screen>{null}</Screen>;

  const monthPrefix = dayKey(month).slice(0, 7);
  const daysThisMonth = [...data.days].filter((d) => d.startsWith(monthPrefix)).length;
  const dayWorkouts = data.workouts.filter((w) => dayKey(w.startedAt) === selected);
  const dayVisits = data.visits.filter((v) => dayKey(v.startAt) === selected);

  const changeMonth = (delta: -1 | 1) => {
    const d = new Date(month);
    d.setDate(1);
    d.setMonth(d.getMonth() + delta);
    setMonth(d.getTime());
    // The selected day's details only make sense for the month on screen.
    setSelected(null);
  };

  return (
    <Screen>
      <Card>
        <MonthCalendar
          month={month}
          today={data.today}
          marked={data.days}
          selected={selected}
          onSelect={setSelected}
          onChangeMonth={changeMonth}
        />
        <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
        <Row style={styles.between}>
          <ThemedText type="caps">Ce mois-ci</ThemedText>
          <ThemedText type="smallBold">
            {daysThisMonth} {daysThisMonth > 1 ? 'jours' : 'jour'} au gym
          </ThemedText>
        </Row>
      </Card>

      {selected && (dayWorkouts.length > 0 || dayVisits.length > 0) && (
        <Animated.View key={selected} entering={FadeInDown.duration(300)}>
          <Card>
            <ThemedText type="caps">{longDate(new Date(`${selected}T12:00:00`).getTime())}</ThemedText>
            {dayVisits.map((v) => (
              <Row key={v.id}>
                <Icon name={v.source === 'manual' ? 'hand.raised.fill' : 'mappin.circle.fill'} size={15} />
                <ThemedText type="small" themeColor="textSecondary">
                  {v.source === 'manual'
                    ? `Check-in à ${time(v.startAt)}`
                    : `${data.gymNames.get(v.gymId ?? -1) ?? 'Salle'} · ${time(v.startAt)}${v.endAt ? ` → ${time(v.endAt)}` : ''}`}
                </ThemedText>
              </Row>
            ))}
            {dayWorkouts.map((w) => (
              <WorkoutRow key={w.id} workout={w} />
            ))}
          </Card>
        </Animated.View>
      )}

      <SectionTitle>Dernières séances</SectionTitle>
      {data.workouts.length === 0 && (
        <Card style={styles.empty}>
          <Icon name="figure.strengthtraining.traditional" size={28} />
          <ThemedText type="small" themeColor="textSecondary">
            Aucune séance pour l&apos;instant.
          </ThemedText>
        </Card>
      )}
      {data.workouts.slice(0, 30).map((w, i) => (
        <Card key={w.id} onPress={() => router.push(`/workout/${w.id}`)}>
          <WorkoutRow workout={w} showDate />
        </Card>
      ))}
    </Screen>
  );
}

function WorkoutRow({ workout, showDate }: { workout: WorkoutSummary; showDate?: boolean }) {
  const theme = useTheme();
  const content = (
    <Row style={{ gap: 12 }}>
      <View style={[styles.iconTile, { backgroundColor: theme.backgroundSelected }]}>
        <Icon name="dumbbell.fill" size={15} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={{ fontWeight: 700 }} numberOfLines={1}>
          {workout.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.date} numberOfLines={1}>
          {showDate ? `${longDate(workout.startedAt)} · ` : ''}
          {workout.exerciseCount} exos · {workout.setCount} séries
        </ThemedText>
      </View>
      <Icon name="chevron.right" size={11} color={theme.textSecondary} />
    </Row>
  );
  // In the list the whole card is the button; inside the day card the row is.
  if (showDate) return content;
  return (
    <Card onPress={() => router.push(`/workout/${workout.id}`)} style={styles.inlineRow}>
      {content}
    </Card>
  );
}

const styles = StyleSheet.create({
  divider: { height: 1, marginVertical: 2 },
  between: { justifyContent: 'space-between' },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  iconTile: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  date: { textTransform: 'capitalize' },
  inlineRow: { padding: 12 },
});
