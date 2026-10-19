import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode, type RefObject } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from '@/components/backdrop';
import { Icon, type SFSymbol } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Gold, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { selectHaptic, tapHaptic } from '@/haptics';
import { useTheme } from '@/hooks/use-theme';

const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

/** Pressable that sinks slightly under the finger. */
export function PressableScale({
  style,
  children,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      {...props}
      onPressIn={(e) => {
        scale.set(withSpring(0.97, PRESS_SPRING));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, PRESS_SPRING));
        onPressOut?.(e);
      }}>
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Scrollable page on the black and champagne backdrop. Tab screens pass a `title`. */
export function Screen({
  title,
  eyebrow,
  children,
  scrollRef,
}: {
  title?: string;
  /** Small capitals above the title, e.g. today's date. */
  eyebrow?: string;
  children: ReactNode;
  /** To scroll the page from the screen, e.g. to the exercise in progress. */
  scrollRef?: RefObject<ScrollView | null>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <Backdrop />
      <ScrollView
        ref={scrollRef}
        // Tab screens pad for the status bar themselves; stack screens let iOS account for the header.
        contentInsetAdjustmentBehavior={title ? 'never' : 'automatic'}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.screen, { paddingTop: title ? insets.top + Spacing.four : Spacing.three }]}>
        {(eyebrow || title) && (
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            {eyebrow && <ThemedText type="caps">{eyebrow}</ThemedText>}
            {title && <ThemedText type="title">{title}</ThemedText>}
          </Animated.View>
        )}
        {children}
      </ScrollView>
    </View>
  );
}

/**
 * Dark card with a thin champagne edge. `index` staggers its entrance; `glow` adds the
 * golden sheen used on each screen's main card; `onPress` makes the whole card touchable.
 */
export function Card({
  children,
  style,
  onLayout,
  index,
  glow,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
  index?: number;
  glow?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const body = (
    <>
      {glow && (
        <LinearGradient
          colors={['rgba(227, 211, 181, 0.13)', 'rgba(227, 211, 181, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 0.8 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {children}
    </>
  );
  const cardStyle = [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }, style];

  return (
    <Animated.View
      entering={index === undefined ? undefined : FadeInDown.delay(index * 60).duration(450)}
      onLayout={onLayout}>
      {onPress ? (
        <PressableScale
          style={cardStyle}
          onPress={() => {
            tapHaptic();
            onPress();
          }}>
          {body}
        </PressableScale>
      ) : (
        <View style={cardStyle}>{body}</View>
      )}
    </Animated.View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="caps" style={styles.sectionTitle}>
      {children}
    </ThemedText>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: SFSymbol;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, small, disabled, style }: ButtonProps) {
  const theme = useTheme();
  const fg = { primary: theme.onAccent, secondary: theme.text, ghost: theme.accent, danger: theme.danger }[variant];
  return (
    <PressableScale
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      disabled={disabled}
      style={[
        styles.button,
        small && styles.buttonSmall,
        variant === 'secondary' && { backgroundColor: theme.backgroundSelected, borderColor: theme.hairline, borderWidth: 1 },
        { opacity: disabled ? 0.4 : 1 },
        style,
      ]}>
      {variant === 'primary' && (
        <LinearGradient
          colors={Gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: small ? 10 : Radius.control }]}
        />
      )}
      {icon && <Icon name={icon} size={small ? 13 : 16} color={fg} />}
      <ThemedText type={small ? 'smallBold' : 'default'} style={{ color: fg, fontWeight: 700 }}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

/** Small round button holding one icon (reorder, remove, previous/next). */
export function IconButton({
  icon,
  onPress,
  disabled,
  color,
}: {
  icon: SFSymbol;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      hitSlop={6}
      disabled={disabled}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={[styles.iconButton, { borderColor: theme.hairline, opacity: disabled ? 0.3 : 1 }]}>
      <Icon name={icon} size={12} color={color} />
    </PressableScale>
  );
}

/** Pill for quick actions and filters. */
export function Chip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: SFSymbol;
  selected?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={() => {
        selectHaptic();
        onPress();
      }}
      style={[
        styles.chip,
        { borderColor: selected ? theme.accent : theme.hairline },
        { backgroundColor: selected ? 'rgba(227, 211, 181, 0.14)' : theme.backgroundElement },
      ]}>
      {icon && <Icon name={icon} size={13} color={selected ? theme.accent : theme.textSecondary} />}
      <ThemedText type="small" style={{ color: selected ? theme.accent : theme.text }}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

/** Tabs with a sliding pill under the selected one. */
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
  const [width, setWidth] = useState(0);
  const segment = options.length ? (width - 6) / options.length : 0;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const pill = useAnimatedStyle(() => ({
    width: segment,
    transform: [{ translateX: withSpring(index * segment, { damping: 20, stiffness: 220 }) }],
  }));

  return (
    <View
      style={[styles.segmented, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && <Animated.View style={[styles.segmentPill, { backgroundColor: theme.backgroundSelected }, pill]} />}
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => {
            if (o.value !== value) selectHaptic();
            onChange(o.value);
          }}
          style={styles.segment}>
          <ThemedText type="smallBold" style={{ color: o.value === value ? theme.accent : theme.textSecondary }}>
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
  const change = (next: number) => {
    if (next === value) return;
    selectHaptic();
    onChange(next);
  };
  return (
    <View style={styles.stepper}>
      <PressableScale
        hitSlop={8}
        onPress={() => change(Math.max(min, value - step))}
        style={[styles.stepperButton, { backgroundColor: theme.backgroundSelected, borderColor: theme.hairline }]}>
        <Icon name="minus" size={12} />
      </PressableScale>
      <ThemedText type="smallBold" style={styles.stepperValue}>
        {format(value)}
      </ThemedText>
      <PressableScale
        hitSlop={8}
        onPress={() => change(Math.min(max, value + step))}
        style={[styles.stepperButton, { backgroundColor: theme.backgroundSelected, borderColor: theme.hairline }]}>
        <Icon name="plus" size={12} />
      </PressableScale>
    </View>
  );
}

export function Input(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      selectionColor={theme.accent}
      // iOS number pads have no key to close them; React Native adds an "OK" bar above
      // them with this label (and only for number pads).
      inputAccessoryViewButtonLabel="OK"
      {...props}
      style={[
        styles.input,
        { color: theme.text, backgroundColor: theme.backgroundSelected, borderColor: theme.hairline },
        props.style,
      ]}
    />
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  screen: {
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: 2, marginBottom: Spacing.one },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three + 2,
    gap: Spacing.two + 2,
    overflow: 'hidden',
  },
  sectionTitle: { marginTop: Spacing.two },
  button: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: Radius.control,
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonSmall: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 10, gap: 5 },
  iconButton: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 3, borderWidth: 1 },
  segmentPill: { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: 9 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { minWidth: 48, textAlign: 'center', fontVariant: ['tabular-nums'] },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
