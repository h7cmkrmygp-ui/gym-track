import '@/global.css';

import { Platform } from 'react-native';

/**
 * "Noir & Champagne": deep black, ivory text and a metallic champagne accent, from the
 * logo. The app is always dark (app.json), so light and dark share one palette.
 */
const palette = {
  text: '#F4F0E8',
  textSecondary: '#8F8E92',
  background: '#08090B',
  /** Cards. */
  backgroundElement: '#121316',
  /** Inputs, pressed states, empty marks. */
  backgroundSelected: '#1E1F24',
  /** Thin champagne borders around cards. */
  hairline: 'rgba(227, 211, 181, 0.14)',
  accent: '#E3D3B5',
  onAccent: '#121212',
  /** Bars and chart marks: a deeper gold that stays readable on the dark cards. */
  chart: '#B98B3E',
  success: '#7FB98A',
  danger: '#E5735F',
} as const;

export const Colors = { light: palette, dark: palette } as const;

export type ThemeColor = keyof typeof palette;

/** Metallic champagne gradient, light to deep: primary buttons, done sets, rings. */
export const Gold = ['#F6EBD3', '#D9BE8C', '#A8834A'] as const;

/** Display serif for screen titles, workout names and hero numbers (loaded in the root layout). */
export const DisplayFont = {
  semibold: 'CormorantGaramond_600SemiBold',
  bold: 'CormorantGaramond_700Bold',
} as const;

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

export const Radius = { card: 20, control: 14, pill: 999 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
