import { HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
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
  // A ring that empties as the rest runs out.
  const ring = (size: number) => (
    <ProgressView
      timerInterval={interval}
      countsDown
      modifiers={[progressViewStyle('circular'), tint(champagne), frame({ width: size, height: size })]}
    />
  );
  const countdown = (size: number) => (
    <Text
      timerInterval={interval}
      countsDown
      modifiers={[font({ size, weight: 'bold', design: 'rounded' }), monospacedDigit(), foregroundStyle(champagne)]}
    />
  );

  return {
    banner: (
      <HStack spacing={14} modifiers={[padding({ all: 16 })]}>
        {ring(44)}
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(muted)]}>Repos</Text>
          <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>
            Prochaine série : {props.exercise}
          </Text>
        </VStack>
        <Spacer />
        {countdown(28)}
      </HStack>
    ),
    compactLeading: <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(champagne)]}>Repos</Text>,
    compactTrailing: ring(20),
    minimal: ring(20),
    expandedLeading: <VStack modifiers={[padding({ leading: 6 })]}>{ring(40)}</VStack>,
    expandedTrailing: countdown(28),
    expandedBottom: (
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>
        Prochaine série : {props.exercise}
      </Text>
    ),
  };
};

export default createLiveActivity('RestTimer', RestActivityLayout);
