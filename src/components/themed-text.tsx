import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { DisplayFont, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'small'
    | 'smallBold'
    /** Small capitals, widely spaced: section labels. */
    | 'caps'
    /** Serif, 30: card titles, workout names. */
    | 'subtitle'
    /** Serif, 40: screen titles. */
    | 'title'
    /** Serif, 56: the one big number of a card. */
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
        { color: theme[themeColor ?? 'text'] },
        styles[type],
        type === 'caps' && !themeColor && { color: theme.accent, opacity: 0.75 },
        type === 'linkPrimary' && { color: theme.accent },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 22, fontWeight: 500 },
  small: { fontSize: 14, lineHeight: 20, fontWeight: 500 },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: 700 },
  caps: { fontSize: 11, lineHeight: 14, fontWeight: 700, letterSpacing: 1.8, textTransform: 'uppercase' },
  subtitle: { fontFamily: DisplayFont.semibold, fontSize: 30, lineHeight: 34 },
  title: { fontFamily: DisplayFont.semibold, fontSize: 40, lineHeight: 44 },
  hero: { fontFamily: DisplayFont.semibold, fontSize: 56, lineHeight: 58 },
  link: { lineHeight: 30, fontSize: 14 },
  linkPrimary: { lineHeight: 30, fontSize: 14 },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
