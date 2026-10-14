import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { MonthCalendar } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { Card, Row, Screen, SectionTitle } from '@/components/ui';
import { listGyms, listVisits } from '@/db/gyms';
import { listFinishedWorkouts, type WorkoutSummary } from '@/db/workouts';
import { useFocusData } from '@/hooks/use-focus-data';
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
  const [data] = useFocusData(loadHistory);
  const [month, setMonth] = useState(() => Date.now());
  const [selected, setSelected] = useState<string | null>(() => dayKey(Date.now()));

  if (!data) return <Screen title="Historique">{null}</Screen>;

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
    <Screen title="Historique">
      <Card>
        <MonthCalendar
          month={month}
          today={data.today}
          marked={data.days}
          selected={selected}
          onSelect={setSelected}
          onChangeMonth={changeMonth}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {daysThisMonth} {daysThisMonth > 1 ? 'jours' : 'jour'} au gym ce mois-ci
        </ThemedText>
      </Card>

      {selected && (dayWorkouts.length > 0 || dayVisits.length > 0) && (
        <Card>
          {dayVisits.map((v) => (
            <ThemedText key={v.id} type="small" themeColor="textSecondary">
              {v.source === 'manual'
                ? `✋ Check-in manuel à ${time(v.startAt)}`
                : `📍 ${data.gymNames.get(v.gymId ?? -1) ?? 'Salle'} · ${time(v.startAt)}${v.endAt ? ` → ${time(v.endAt)}` : ''}`}
            </ThemedText>
          ))}
          {dayWorkouts.map((w) => (
            <WorkoutRow key={w.id} workout={w} />
          ))}
        </Card>
      )}

      <SectionTitle>Dernières séances</SectionTitle>
      {data.workouts.length === 0 && <ThemedText themeColor="textSecondary">Aucune séance pour l&apos;instant.</ThemedText>}
      {data.workouts.slice(0, 30).map((w) => (
        <Card key={w.id}>
          <WorkoutRow workout={w} showDate />
        </Card>
      ))}
    </Screen>
  );
}

function WorkoutRow({ workout, showDate }: { workout: WorkoutSummary; showDate?: boolean }) {
  return (
    <Pressable onPress={() => router.push(`/workout/${workout.id}`)}>
      <Row style={styles.row}>
        <ThemedText style={{ fontWeight: 700, flex: 1 }}>🏋️ {workout.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {workout.exerciseCount} exos · {workout.setCount} séries
        </ThemedText>
      </Row>
      {showDate && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
          {longDate(workout.startedAt)} · {time(workout.startedAt)}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { justifyContent: 'space-between' },
  date: { textTransform: 'capitalize' },
});
