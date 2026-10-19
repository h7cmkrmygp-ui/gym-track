import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, RoundedFont, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'small'
    | 'smallBold'
    /** Small capitals in gray: the label above a metric (like "MOVE" in Fitness). */
    | 'caps'
    /** 22 bold: card and section titles. */
    | 'subtitle'
    /** 34 bold: in-page large titles. */
    | 'title'
    /** 28 bold rounded: a metric value. */
    | 'number'
    /** 48 bold rounded: the one big number of a card. */
    | 'hero'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? (type === 'caps' ? 'textSecondary' : 'text')] },
        styles[type],
        type === 'linkPrimary' && { color: theme.accent },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: { fontSize: 17, lineHeight: 22, fontWeight: 400 },
  small: { fontSize: 15, lineHeight: 20, fontWeight: 400 },
  smallBold: { fontSize: 15, lineHeight: 20, fontWeight: 600 },
  caps: { fontSize: 13, lineHeight: 16, fontWeight: 600, letterSpacing: 0.2, textTransform: 'uppercase' },
  subtitle: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
  title: { fontSize: 34, lineHeight: 41, fontWeight: 700 },
  number: { fontFamily: RoundedFont, fontSize: 28, lineHeight: 32, fontWeight: 700, fontVariant: ['tabular-nums'] },
  hero: { fontFamily: RoundedFont, fontSize: 48, lineHeight: 52, fontWeight: 700, fontVariant: ['tabular-nums'] },
  link: { lineHeight: 30, fontSize: 15 },
  linkPrimary: { lineHeight: 30, fontSize: 15 },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
