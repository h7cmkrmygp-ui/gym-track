import { HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  multilineTextAlignment,
  padding,
  progressViewStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';

/** Timestamps (ms) rather than dates: props are serialized to the activity. */
export type RestActivityProps = { exercise: string; startedAt: number; endsAt: number };

// Runs in the widget's own isolated runtime: everything it uses must be declared inside.
// iOS animates the ring and the countdown itself, so the app does not update them.
const RestActivityLayout = (props: RestActivityProps) => {
  'widget';
  const champagne = '#E3D3B5';
  const muted = '#9A9AA0';
  const interval = { lower: new Date(props.startedAt), upper: new Date(props.endsAt) };
  // A ring that empties as the rest runs out. Nothing is written inside (patched in
  // @expo/ui): the time goes next to it, where it fits.
  const ring = (size: number) => (
    <ProgressView
      timerInterval={interval}
      countsDown
      modifiers={[progressViewStyle('circular'), tint(champagne), frame({ width: size, height: size })]}
    />
  );
  // A timer text takes all the width it can, so it gets just enough for "0:00".
  const countdown = (size: number, width: number) => (
    <Text
      timerInterval={interval}
      countsDown
      modifiers={[
        font({ size, weight: 'bold', design: 'rounded' }),
        monospacedDigit(),
        foregroundStyle(champagne),
        multilineTextAlignment('trailing'),
        frame({ width, alignment: 'trailing' }),
      ]}
    />
  );
  const nextSet = (size: number) => (
    <Text modifiers={[font({ size, weight: 'bold' }), foregroundStyle('#FFFFFF'), lineLimit(1)]}>
      Prochaine série : {props.exercise}
    </Text>
  );

  return {
    banner: (
      <HStack spacing={14} modifiers={[padding({ all: 16 })]}>
        {ring(40)}
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(muted)]}>Repos</Text>
          {nextSet(17)}
        </VStack>
        <Spacer />
        {countdown(30, 84)}
      </HStack>
    ),
    compactLeading: ring(18),
    compactTrailing: countdown(15, 46),
    minimal: ring(18),
    expandedLeading: <VStack modifiers={[padding({ leading: 6 })]}>{ring(40)}</VStack>,
    expandedTrailing: countdown(28, 80),
    expandedBottom: nextSet(15),
  };
};

export default createLiveActivity('RestTimer', RestActivityLayout);
