import '@/global.css';

import { Platform } from 'react-native';

/**
 * Apple Fitness look in the logo's black and champagne: pure black background, gray
 * grouped cards, white text and a champagne accent. Always dark (app.json).
 */
const palette = {
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  background: '#000000',
  /** Cards (iOS secondary grouped background). */
  backgroundElement: '#1C1C1E',
  /** Inputs, pressed states, segmented tracks (iOS tertiary background). */
  backgroundSelected: '#2C2C2E',
  /** Separators inside cards. */
  hairline: '#38383A',
  accent: '#E3D3B5',
  onAccent: '#000000',
  /** Bars and single-series chart marks. */
  chart: '#B98B3E',
  success: '#30D158',
  danger: '#FF453A',
} as const;

export const Colors = { light: palette, dark: palette } as const;

export type ThemeColor = keyof typeof palette;

/**
 * The three activity rings, like Move / Exercise / Stand: gold, copper and steel.
 * Checked for contrast and colour-blind separation on the card background.
 */
export const RingColors = {
  days: '#B98D35',
  sets: '#A9503A',
  minutes: '#4F8BD4',
} as const;

/** SF Pro Rounded, as Fitness uses for its numbers. */
export const RoundedFont = Platform.select({ ios: 'ui-rounded', default: undefined });

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { card: 14, control: 12, pill: 999 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
