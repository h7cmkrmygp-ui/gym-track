import { Circle, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { WidgetData } from '@/logic/widget';

// Runs in the widget's own isolated runtime: everything it uses must be declared inside.
const GymWidgetLayout = (props: WidgetData, environment: WidgetEnvironment) => {
  'widget';
  const champagne = '#E3D3B5';
  const muted = '#8E8E93';
  const white = '#FFFFFF';
  const empty = '#34353A';
  const background = containerBackground(
    { type: 'linearGradient', colors: ['#1C1D21', '#0D0E10'], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    'widget',
  );
  const fill = frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' });

  if (!props || props.goal === undefined) {
    return (
      <VStack modifiers={[fill, background]}>
        <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(white)]}>
          Ouvre GymTrack pour afficher ta semaine.
        </Text>
      </VStack>
    );
  }

  const letters = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const dot = environment.widgetFamily === 'systemLarge' ? 22 : 14;
  const weekRow = (
    <HStack spacing={environment.widgetFamily === 'systemLarge' ? 12 : 6}>
      {props.weekDays.map((went, i) => (
        <VStack key={i} spacing={3}>
          <Text
            modifiers={[
              font({ size: 10, weight: i === props.todayIndex ? 'bold' : 'regular' }),
              foregroundStyle(i === props.todayIndex ? white : muted),
            ]}>
            {letters[i]}
          </Text>
          <Circle modifiers={[frame({ width: dot, height: dot }), foregroundStyle(went ? champagne : empty)]} />
        </VStack>
      ))}
    </HStack>
  );
  const streak = (
    <Text modifiers={[font({ size: 22, weight: 'bold', design: 'rounded' }), foregroundStyle(champagne)]}>
      🔥 {props.streak} sem.
    </Text>
  );
  const week = (
    <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle(white)]}>
      {props.week}/{props.goal} cette semaine
    </Text>
  );
  const next = (
    <VStack alignment="leading" spacing={1}>
      <Text modifiers={[font({ size: 10, weight: 'semibold' }), foregroundStyle(muted)]}>PROCHAINE</Text>
      <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle(white)]}>
        {props.next ?? 'Séance libre'}
      </Text>
    </VStack>
  );

  if (environment.widgetFamily === 'systemMedium') {
    return (
      <HStack spacing={16} modifiers={[fill, background]}>
        <VStack alignment="leading" spacing={6}>
          {streak}
          {week}
          <Spacer />
          {weekRow}
        </VStack>
        <Spacer />
        <VStack alignment="leading" spacing={6}>
          {next}
          <Spacer />
          {props.last && (
            <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{props.last}</Text>
          )}
        </VStack>
      </HStack>
    );
  }

  if (environment.widgetFamily === 'systemLarge') {
    return (
      <VStack alignment="leading" spacing={10} modifiers={[fill, background]}>
        <HStack>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(muted)]}>GymTrack</Text>
          <Spacer />
          {streak}
        </HStack>
        <Text modifiers={[font({ size: 20, weight: 'bold' }), foregroundStyle(white)]}>
          {props.week}/{props.goal} jours cette semaine
        </Text>
        {weekRow}
        <VStack alignment="leading" spacing={4} modifiers={[padding({ top: 6 })]}>
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(muted)]}>PROCHAINE SÉANCE</Text>
          <Text modifiers={[font({ size: 22, weight: 'bold' }), foregroundStyle(champagne)]}>
            {props.next ?? 'Séance libre'}
          </Text>
          {props.nextExercises.slice(0, 6).map((name, i) => (
            <Text key={i} modifiers={[font({ size: 14 }), foregroundStyle(white)]}>
              · {name}
            </Text>
          ))}
        </VStack>
        <Spacer />
        {props.last && (
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>Dernière : {props.last}</Text>
        )}
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={4} modifiers={[fill, background]}>
      {streak}
      {week}
      <Spacer />
      {next}
    </VStack>
  );
};

export default createWidget('GymWidget', GymWidgetLayout);
