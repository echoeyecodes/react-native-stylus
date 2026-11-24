import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Rect } from "../../shared/protocol";
import { motion, themedStyles } from "../theme";
import { useKeyboard } from "../use-keyboard";

/** Space between the picked element and the composer or the screen top. */
const GAP = 16;

type Props = {
  /** The picked element to keep in view. */
  frame: Rect | null;
  /** The dock drives it and resets it on close. */
  appShift: Animated.Value;
  /** Called on a tap outside the composer. */
  onDismiss: () => void;
  children: ReactNode;
};

/** Slides the app up so the picked element stays visible above the keyboard. */
export function ComposerDock({ frame, appShift, onDismiss, children }: Props) {
  const styles = useStyles();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboard();
  const [height, setHeight] = useState(0);
  const lift = useRef(new Animated.Value(0)).current;
  const [coverOpacity] = useState(() =>
    appShift.interpolate({ inputRange: [0, 16], outputRange: [0, 1], extrapolate: "clamp" }),
  );

  useEffect(() => {
    Animated.timing(lift, {
      toValue: -keyboard.height,
      duration: keyboard.duration,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start();
  }, [lift, keyboard]);

  useEffect(() => {
    if (!frame || height === 0) return;
    const visibleBottom = window.height - keyboard.height - height;
    const needed = frame.y + frame.height + GAP - visibleBottom;
    // A tall element keeps its top in view rather than its bottom.
    const furthest = Math.max(0, frame.y - insets.top - GAP);
    Animated.timing(appShift, {
      toValue: Math.max(0, Math.min(needed, furthest)),
      duration: keyboard.duration,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start();
  }, [appShift, frame, height, keyboard, window.height, insets.top]);

  useEffect(
    () => () => {
      Animated.timing(appShift, { toValue: 0, duration: 280, easing: motion.easeOut, useNativeDriver: true }).start();
    },
    [appShift],
  );

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable accessibilityLabel="Close the composer" onPress={onDismiss} style={StyleSheet.absoluteFill} />
      {/* Covers the status bar area once the app slides under it. */}
      <Animated.View pointerEvents="none" style={[styles.cover, { height: insets.top, opacity: coverOpacity }]} />
      <Animated.View
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
        style={[
          styles.dock,
          { paddingBottom: keyboard.height > 0 ? 8 : Math.max(insets.bottom, 8), transform: [{ translateY: lift }] },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    cover: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: palette.sheet },
    dock: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: 8,
      paddingHorizontal: 8,
      backgroundColor: palette.sheet,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: palette.sheetBorder,
      boxShadow: palette.sheetShadow,
    },
  }),
);
