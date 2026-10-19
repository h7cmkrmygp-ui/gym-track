import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ComponentProps } from 'react';

import { useTheme } from '@/hooks/use-theme';

export type SFSymbol = Extract<SymbolViewProps['name'], string>;

/** SF Symbol in the app's colors (champagne by default). */
export function Icon({
  name,
  size = 18,
  color,
  weight = 'semibold',
  animationSpec,
  style,
}: {
  name: SFSymbol;
  size?: number;
  color?: string;
  weight?: SymbolViewProps['weight'];
  animationSpec?: SymbolViewProps['animationSpec'];
  style?: ComponentProps<typeof SymbolView>['style'];
}) {
  const theme = useTheme();
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color ?? theme.accent}
      weight={weight}
      type="hierarchical"
      animationSpec={animationSpec}
      style={[{ width: size, height: size }, style]}
    />
  );
}
