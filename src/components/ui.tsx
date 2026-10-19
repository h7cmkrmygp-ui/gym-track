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
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { GlassView } from 'expo-glass-effect';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Icon, type SFSymbol } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Colors, MaxContentWidth, Radius, RingColors, Spacing } from '@/constants/theme';
import { liquidGlass } from '@/env';
import { selectHaptic, tapHaptic } from '@/haptics';
import { useTheme } from '@/hooks/use-theme';

const PRESS_SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Liquid Glass surface (iOS 26) for controls and floating panels, which belong above the
 * content; cards stay solid. Before iOS 26, `fallback` fills it instead. Never fade a glass
 * view or one of its parents in from opacity 0: the effect stops rendering.
 */
export function Glass({
  fallback,
  interactive,
  tint,
  style,
  ...props
}: ViewProps & {
  /** Fill on systems without Liquid Glass. */
  fallback: string;
  /** Flexes under the finger, for controls. */
  interactive?: boolean;
  tint?: string;
}) {
  if (!liquidGlass) return <View {...props} style={[style, { backgroundColor: fallback }]} />;
  return (
    <GlassView
      {...props}
      style={style}
      glassEffectStyle="regular"
      colorScheme="dark"
      isInteractive={interactive}
      tintColor={tint}
    />
  );
}

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
    <AnimatedPressable
      {...props}
      style={[style, animated]}
      onPressIn={(e) => {
        scale.set(withSpring(0.97, PRESS_SPRING));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, PRESS_SPRING));
        onPressOut?.(e);
      }}>
      {children}
    </AnimatedPressable>
  );
}

/** Soft champagne and copper light behind the large title, for the glass bars to catch. */
function AmbientGlow() {
  return (
    <View pointerEvents="none" style={styles.glow}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="champagne" cx="15%" cy="42%" rx="80%" ry="42%">
            <Stop offset="0" stopColor={Colors.dark.accent} stopOpacity={0.2} />
            <Stop offset="1" stopColor={Colors.dark.accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="copper" cx="100%" cy="30%" rx="65%" ry="36%">
            <Stop offset="0" stopColor={RingColors.sets} stopOpacity={0.16} />
            <Stop offset="1" stopColor={RingColors.sets} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#copper)" />
        <Rect width="100%" height="100%" fill="url(#champagne)" />
      </Svg>
    </View>
  );
}

/**
 * Scrollable page on a black background. The title is the native large title of the
 * navigation bar, which shrinks as the page scrolls; `eyebrow` is the small gray line
 * above the content (e.g. today's date, as in Fitness).
 */
export function Screen({
  eyebrow,
  children,
  scrollRef,
}: {
  eyebrow?: string;
  children: ReactNode;
  /** To scroll the page from the screen, e.g. to the exercise in progress. */
  scrollRef?: RefObject<ScrollView | null>;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.screen}>
      <AmbientGlow />
      {eyebrow && (
        <ThemedText type="caps" style={styles.eyebrow}>
          {eyebrow}
        </ThemedText>
      )}
      {children}
    </ScrollView>
  );
}

/**
 * Gray rounded card, as in Fitness. With `title` it gets a header line; with `onPress`
 * the whole card is touchable and the header shows a chevron.
 */
export function Card({
  children,
  style,
  onLayout,
  title,
  titleColor,
  onPress,
  flex,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
  title?: string;
  titleColor?: string;
  onPress?: () => void;
  /** Share a row equally with sibling cards. */
  flex?: boolean;
}) {
  const theme = useTheme();
  const body = (
    <>
      {title && (
        <Row style={styles.cardHeader}>
          <ThemedText type="smallBold" style={[{ flex: 1 }, titleColor ? { color: titleColor } : null]}>
            {title}
          </ThemedText>
          {onPress && <Icon name="chevron.right" size={13} color={theme.textSecondary} />}
        </Row>
      )}
      {children}
    </>
  );
  const cardStyle = [styles.card, { backgroundColor: theme.backgroundElement }, flex && styles.flex, style];

  return (
    <View onLayout={onLayout} style={flex && styles.flex}>
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
    </View>
  );
}

/** Small gray header above a grouped list, as in iOS Settings. */
export function GroupHeader({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="caps" style={styles.groupHeader}>
      {children}
    </ThemedText>
  );
}

/** Section heading between cards, as in Fitness ("Tendances", "Séances"…). */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="subtitle" style={styles.sectionTitle}>
      {children}
    </ThemedText>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** `tinted` is for buttons sitting on glass, which must not be glass themselves. */
  variant?: 'primary' | 'secondary' | 'tinted' | 'ghost' | 'danger';
  icon?: SFSymbol;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Capsule button. The primary one is solid champagne; secondary and destructive ones are
 * Liquid Glass, as in iOS 26.
 */
export function Button({ label, onPress, variant = 'primary', icon, small, disabled, style }: ButtonProps) {
  const theme = useTheme();
  const glass = variant === 'secondary' || (variant === 'danger' && !small);
  const bg = {
    primary: theme.accent,
    secondary: theme.backgroundSelected,
    tinted: theme.accentTint,
    ghost: 'transparent',
    danger: small ? 'transparent' : theme.backgroundElement,
  }[variant];
  const fg = {
    primary: theme.onAccent,
    secondary: theme.accent,
    tinted: theme.accent,
    ghost: theme.accent,
    danger: theme.danger,
  }[variant];
  // Dimming a glass view breaks it, so a disabled glass button dims its label instead.
  const dim = { opacity: disabled ? 0.4 : 1 };
  const shape = [styles.button, small && styles.buttonSmall];
  const content = (
    <>
      {icon && <Icon name={icon} size={small ? 13 : 16} color={fg} style={glass ? dim : undefined} />}
      <ThemedText type={small ? 'smallBold' : 'default'} style={[{ color: fg, fontWeight: 600 }, glass && dim]}>
        {label}
      </ThemedText>
    </>
  );
  return (
    <PressableScale
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      disabled={disabled}
      style={[!glass && dim, style]}>
      {glass ? (
        <Glass interactive fallback={bg} style={shape}>
          {content}
        </Glass>
      ) : (
        <View style={[shape, { backgroundColor: bg }]}>{content}</View>
      )}
    </PressableScale>
  );
}

/** Small round glass button holding one icon (reorder, remove, previous/next). */
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
      style={styles.iconButtonHit}>
      <Glass interactive fallback={theme.backgroundSelected} style={styles.iconButton}>
        <Icon name={icon} size={12} color={color} style={{ opacity: disabled ? 0.3 : 1 }} />
      </Glass>
    </PressableScale>
  );
}

/** Capsule for quick actions and filters: glass, or solid champagne once selected. */
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
  const fg = selected ? theme.onAccent : theme.text;
  const content = (
    <>
      {icon && <Icon name={icon} size={13} color={selected ? theme.onAccent : theme.accent} />}
      <ThemedText type="small" style={{ color: fg, fontWeight: 600 }}>
        {label}
      </ThemedText>
    </>
  );
  return (
    <PressableScale
      onPress={() => {
        selectHaptic();
        onPress();
      }}>
      {selected ? (
        <View style={[styles.chip, { backgroundColor: theme.accent }]}>{content}</View>
      ) : (
        <Glass interactive fallback={theme.backgroundSelected} style={styles.chip}>
          {content}
        </Glass>
      )}
    </PressableScale>
  );
}

/** iOS segmented control on glass, with the selected capsule sliding into place. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const [width, setWidth] = useState(0);
  const segment = options.length ? (width - 4) / options.length : 0;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const pill = useAnimatedStyle(() => ({
    width: segment,
    transform: [{ translateX: withSpring(index * segment, { damping: 22, stiffness: 260 }) }],
  }));

  return (
    <Glass
      fallback="rgba(118, 118, 128, 0.24)"
      style={styles.segmented}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && <Animated.View style={[styles.segmentPill, pill]} />}
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => {
            if (o.value !== value) selectHaptic();
            onChange(o.value);
          }}
          style={styles.segment}>
          <ThemedText type="caps" style={styles.segmentLabel}>
            {o.label}
          </ThemedText>
        </Pressable>
      ))}
    </Glass>
  );
}

/** iOS-style stepper: the value, then a "− | +" pill. */
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
      <ThemedText type="small" themeColor="textSecondary" style={styles.stepperValue}>
        {format(value)}
      </ThemedText>
      <View style={[styles.stepperPill, { backgroundColor: theme.backgroundSelected }]}>
        <Pressable
          hitSlop={6}
          disabled={value <= min}
          onPress={() => change(Math.max(min, value - step))}
          style={({ pressed }) => [styles.stepperHalf, { opacity: value <= min ? 0.3 : pressed ? 0.5 : 1 }]}>
          <Icon name="minus" size={13} color={theme.text} />
        </Pressable>
        <View style={[styles.stepperDivider, { backgroundColor: theme.hairline }]} />
        <Pressable
          hitSlop={6}
          disabled={value >= max}
          onPress={() => change(Math.min(max, value + step))}
          style={({ pressed }) => [styles.stepperHalf, { opacity: value >= max ? 0.3 : pressed ? 0.5 : 1 }]}>
          <Icon name="plus" size={13} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

export function Input(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      selectionColor={theme.accent}
      keyboardAppearance="dark"
      // iOS number pads have no key to close them; React Native adds an "OK" bar above
      // them with this label (and only for number pads).
      inputAccessoryViewButtonLabel="OK"
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
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: 12,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  eyebrow: { marginTop: -4, marginBottom: 2 },
  glow: { position: 'absolute', top: -340, left: -Spacing.three, right: -Spacing.three, height: 680 },
  card: { borderRadius: Radius.card, borderCurve: 'continuous', padding: Spacing.three, gap: 10, overflow: 'hidden' },
  cardHeader: { marginBottom: 2 },
  flex: { flex: 1 },
  sectionTitle: { marginTop: Spacing.three },
  groupHeader: { marginTop: Spacing.three, marginBottom: -4, marginLeft: Spacing.three },
  button: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: Radius.control,
    paddingVertical: 15,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, gap: 5 },
  iconButtonHit: { borderRadius: 16 },
  iconButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  segmented: { flexDirection: 'row', borderRadius: Radius.pill, padding: 2 },
  segmentPill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  segmentLabel: { color: '#FFFFFF', textTransform: 'none', fontSize: 13 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperValue: { minWidth: 40, textAlign: 'right', fontVariant: ['tabular-nums'] },
  stepperPill: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.pill, height: 32 },
  stepperHalf: { width: 46, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepperDivider: { width: 1, height: 18 },
  input: { borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 12, fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
