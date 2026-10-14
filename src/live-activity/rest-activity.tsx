import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, monospacedDigit, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';

/** Timestamps (ms) rather than dates: props are serialized to the activity. */
export type RestActivityProps = { exercise: string; startedAt: number; endsAt: number };

// Runs in the widget's own isolated runtime: everything it uses must be declared inside.
// iOS animates the countdown itself, so the app does not need to update it every second.
const RestActivityLayout = (props: RestActivityProps) => {
  'widget';
  const champagne = '#E3D3B5';
  const muted = '#9A9AA0';
  const interval = { lower: new Date(props.startedAt), upper: new Date(props.endsAt) };
  const countdown = (size: number) => (
    <Text
      timerInterval={interval}
      countsDown
      modifiers={[font({ size, weight: 'bold', design: 'rounded' }), monospacedDigit(), foregroundStyle(champagne)]}
    />
  );

  return {
    banner: (
      <HStack modifiers={[padding({ all: 16 })]}>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(muted)]}>Repos</Text>
          <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>
            Prochaine série : {props.exercise}
          </Text>
        </VStack>
        <Spacer />
        {countdown(36)}
      </HStack>
    ),
    compactLeading: <Text modifiers={[foregroundStyle(champagne)]}>⏱</Text>,
    compactTrailing: countdown(15),
    minimal: <Text modifiers={[foregroundStyle(champagne)]}>⏱</Text>,
    expandedLeading: (
      <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(muted), padding({ leading: 6 })]}>
        Repos
      </Text>
    ),
    expandedTrailing: countdown(28),
    expandedBottom: (
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>
        Prochaine série : {props.exercise}
      </Text>
    ),
  };
};

export default createLiveActivity('RestTimer', RestActivityLayout);
