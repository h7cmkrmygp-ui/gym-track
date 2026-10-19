import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/** Page background: deep black with a soft champagne glow at the top, like the logo's light. */
export function Backdrop() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const glowHeight = width * 1.1;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#0E0F12', theme.background]} style={StyleSheet.absoluteFill} />
      <Svg width={width} height={glowHeight} style={styles.glow}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="0%" rx="70%" ry="60%">
            <Stop offset="0" stopColor={theme.accent} stopOpacity={0.13} />
            <Stop offset="0.55" stopColor={theme.accent} stopOpacity={0.04} />
            <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width / 2} cy={0} rx={width} ry={glowHeight} fill="url(#glow)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0 },
});
