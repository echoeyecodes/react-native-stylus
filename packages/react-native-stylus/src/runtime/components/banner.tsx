import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { motion, themedStyles, usePalette } from "../theme";
import { PulsingText } from "./pulsing-text";

/** A swipe up this far, or this fast, dismisses the banner. */
const DISMISS_DISTANCE = 28;
const DISMISS_VELOCITY = 0.5;

type BannerProps = {
  /** Tapping anywhere but the actions. */
  onPress: () => void;
  /** Swiping the banner up. Null when it can't be dismissed, such as while Claude is working. */
  onDismiss: (() => void) | null;
  /** Leading visual, the text, and then any actions. */
  children: ReactNode;
  actions?: ReactNode;
};

/** A bar at the top of the screen that keeps the app in view while Claude works. */
export function Banner({ onPress, onDismiss, children, actions }: BannerProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const enter = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 280, easing: motion.easeOut, useNativeDriver: true }).start();
  }, [enter]);

  const [pan] = useState(() => {
    const springBack = () =>
      Animated.spring(drag, { toValue: 0, bounciness: 0, speed: 20, useNativeDriver: true }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, { dx, dy }) =>
        onDismissRef.current !== null && dy < -4 && Math.abs(dy) > Math.abs(dx),
      // Dragging down meets resistance, since the banner has nowhere to go.
      onPanResponderMove: (_event, { dy }) => drag.setValue(dy < 0 ? dy : dy * 0.2),
      onPanResponderRelease: (_event, { dy, vy }) => {
        const dismiss = onDismissRef.current;
        if (!dismiss || (dy > -DISMISS_DISTANCE && vy > -DISMISS_VELOCITY)) return springBack();
        Animated.timing(drag, { toValue: -160, duration: 200, easing: motion.easeOut, useNativeDriver: true }).start(
          () => dismiss(),
        );
      },
      onPanResponderTerminate: springBack,
    });
  });

  return (
    <Animated.View
      {...pan.panHandlers}
      style={[
        styles.banner,
        {
          top: insets.top + 4,
          opacity: enter,
          transform: [
            { translateY: Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }), drag) },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens the conversation"
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
      {actions && <View style={styles.actions}>{actions}</View>}
    </Animated.View>
  );
}

const LEAD_HEIGHT = 40;

/** The leading slot, holding a spinner, a thumbnail, or nothing. */
export function BannerLead({ children }: { children?: ReactNode }) {
  const styles = useStyles();
  return <View style={[styles.lead, !children && styles.leadEmpty]}>{children}</View>;
}

export function BannerSpinner() {
  const palette = usePalette();
  return <ActivityIndicator size="small" color={palette.secondary} />;
}

type BannerTextProps = {
  title: string;
  subtitle?: ReactNode;
  /** `danger` for a crash or a failure. */
  tone?: "plain" | "danger";
  /** Pulses the title while work is in progress. */
  busy?: boolean;
};

export function BannerText({ title, subtitle, tone = "plain", busy = false }: BannerTextProps) {
  const styles = useStyles();
  const titleStyle = [styles.title, tone === "danger" && styles.danger];
  return (
    <View style={styles.text}>
      {busy ? (
        <PulsingText numberOfLines={1} style={titleStyle}>
          {title}
        </PulsingText>
      ) : (
        <Text numberOfLines={1} style={titleStyle}>
          {title}
        </Text>
      )}
      {subtitle != null && (
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    banner: {
      position: "absolute",
      left: 10,
      right: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      padding: 8,
      borderRadius: 22,
      borderCurve: "continuous",
      backgroundColor: palette.sheet,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.sheetBorder,
      boxShadow: palette.bannerShadow,
    },
    body: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: LEAD_HEIGHT },
    pressed: { opacity: 0.7 },
    lead: { minWidth: 40, height: LEAD_HEIGHT, alignItems: "center", justifyContent: "center" },
    leadEmpty: { minWidth: 0, width: 2 },
    text: { flex: 1, gap: 1 },
    title: { color: palette.text, fontSize: 15, fontWeight: "600", letterSpacing: -0.1 },
    danger: { color: palette.danger },
    subtitle: { color: palette.tertiary, fontSize: 13 },
    actions: { flexDirection: "row", gap: 6 },
  }),
);
