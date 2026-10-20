import { Platform } from 'react-native';

import { isExpoGo } from '@/env';

import type { RestActivityProps } from './rest-activity';

const available = Platform.OS === 'ios' && !isExpoGo;

// Loaded lazily: the native widgets module does not exist in Expo Go.
const loadFactory = async () => (await import('./rest-activity')).default;

/** Shows the rest countdown on the lock screen and in the Dynamic Island, or updates it. */
export async function showRestActivity(props: RestActivityProps) {
  if (!available) return;
  try {
    const factory = await loadFactory();
    const [current] = factory.getInstances();
    if (current) await current.update(props, new Date(props.endsAt));
    // No URL: tapping it just brings the app back as it was. A link would navigate, and
    // "gymtrack://" left the workout in progress for the home screen.
    else factory.start(props, undefined, new Date(props.endsAt));
  } catch (e) {
    console.warn('Live Activity failed', e);
  }
}

/** Removes every rest activity, including ones left over from a previous launch. */
export async function endRestActivity() {
  if (!available) return;
  try {
    const factory = await loadFactory();
    await Promise.all(factory.getInstances().map((a) => a.end('immediate')));
  } catch (e) {
    console.warn('Live Activity failed', e);
  }
}
