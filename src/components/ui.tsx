import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Scrollable page. Tab screens pass a `title`; stack screens get theirs from the header. */
export function Screen({ title, children }: { title?: string; children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      // Tab screens pad for the status bar themselves; stack screens let iOS account for the header.
      contentInsetAdjustmentBehavior={title ? 'never' : 'automatic'}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.screen,
        { paddingTop: title ? insets.top + Spacing.three : Spacing.three },
      ]}>
      {title && <ThemedText type="subtitle">{title}</ThemedText>}
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.backgroundElement }, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
      {children}
    </ThemedText>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', small, disabled, style }: ButtonProps) {
  const theme = useTheme();
  const bg = {
    primary: theme.accent,
    secondary: theme.backgroundSelected,
    ghost: 'transparent',
    danger: 'transparent',
  }[variant];
  const fg = { primary: theme.onAccent, secondary: theme.text, ghost: theme.accent, danger: theme.danger }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}>
      <ThemedText type={small ? 'smallBold' : 'default'} style={{ color: fg, fontWeight: 700 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundElement }]}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[styles.segment, o.value === value && { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold" themeColor={o.value === value ? 'text' : 'textSecondary'}>
            {o.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

/** A "−  value  +" control for small integers (sets, reps, seconds, meters). */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  format = String,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.stepper}>
      <Pressable
        hitSlop={8}
        onPress={() => onChange(Math.max(min, value - step))}
        style={[styles.stepperButton, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold">−</ThemedText>
      </Pressable>
      <ThemedText type="smallBold" style={styles.stepperValue}>
        {format(value)}
      </ThemedText>
      <Pressable
        hitSlop={8}
        onPress={() => onChange(Math.min(max, value + step))}
        style={[styles.stepperButton, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold">+</ThemedText>
      </Pressable>
    </View>
  );
}

export function Input(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      {...props}
      style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSelected }, props.style]}
    />
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.two },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  segmented: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepperButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 44, textAlign: 'center' },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
