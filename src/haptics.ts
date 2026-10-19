import * as Haptics from 'expo-haptics';

// Fire-and-forget: a missing haptic engine must never break an action.
const safe = (p: Promise<void>) => p.catch(() => {});

/** A button or card was pressed. */
export const tapHaptic = () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
/** A value changed step by step (steppers, tabs). */
export const selectHaptic = () => safe(Haptics.selectionAsync());
/** A set was ticked. */
export const setDoneHaptic = () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
/** A record, a finished workout. */
export const successHaptic = () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
