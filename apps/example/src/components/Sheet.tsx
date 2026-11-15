import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, shadows, spacing } from "../theme";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  /** Sits above the scrolling content and drags the sheet closed. */
  header?: ReactNode;
  /** Stays pinned to the bottom, for the sheet's main action. */
  footer?: ReactNode;
  /** The drag handle is light over a photo and dark over the sheet's surface. */
  handle?: "onPhoto" | "onSurface";
  children: ReactNode;
};

const OPEN_EASING = Easing.bezier(0.32, 0.72, 0, 1);
/** Dragged further than this, or flicked, the sheet closes. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.9;

export function Sheet({ open, onClose, header, footer, handle = "onSurface", children }: SheetProps) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(open);
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (open) {
      setMounted(true);
      drag.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 420, easing: OPEN_EASING, useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => finished && setMounted(false));
    }
  }, [open, progress, drag]);

  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, { dx, dy }) => dy > 4 && Math.abs(dy) > Math.abs(dx),
      onPanResponderMove: (_event, { dy }) => drag.setValue(Math.max(0, dy)),
      onPanResponderRelease: (_event, { dy, vy }) => {
        if (dy > DISMISS_DISTANCE || vy > DISMISS_VELOCITY) onCloseRef.current();
        else Animated.spring(drag, { toValue: 0, bounciness: 0, speed: 18, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () =>
        Animated.spring(drag, { toValue: 0, bounciness: 0, speed: 18, useNativeDriver: true }).start(),
    }),
  );

  if (!mounted) return null;

  const hidden = window.height;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? "auto" : "none"}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            maxHeight: window.height - insets.top - spacing.md,
            transform: [
              {
                translateY: Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [hidden, 0] }), drag),
              },
            ],
          },
        ]}
      >
        <View {...pan.panHandlers}>
          {header}
          <View style={[styles.handle, handle === "onPhoto" && styles.handleOnPhoto]} pointerEvents="none" />
        </View>
        <ScrollView style={styles.body} bounces={false} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>{footer}</View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve: "continuous",
    boxShadow: shadows.sheet,
  },
  handle: {
    position: "absolute",
    top: spacing.sm,
    alignSelf: "center",
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  handleOnPhoto: { backgroundColor: "rgba(255, 255, 255, 0.85)" },
  body: { flexGrow: 0 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
});
