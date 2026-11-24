import { useEffect, useRef } from "react";
import { Animated, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";
import { motion, themedStyles, usePalette } from "../theme";
import { Icon } from "./icon";

const SIZE = 60;
/** A bubble dropped within this distance of the target's centre is removed. */
const REACH = 72;

type Props = {
  /** While a bubble is being dragged. */
  shown: boolean;
  /** Releasing now removes the dragged bubble. */
  hot: boolean;
};

export function RemoveTarget({ shown, hot }: Props) {
  const styles = useStyles();
  const palette = usePalette();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const enter = useRef(new Animated.Value(0)).current;
  const grow = useRef(new Animated.Value(1)).current;
  const center = removeTargetCenter(window, insets);

  useEffect(() => {
    Animated.timing(enter, {
      toValue: shown ? 1 : 0,
      duration: shown ? 240 : 180,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start();
  }, [enter, shown]);

  useEffect(() => {
    Animated.spring(grow, { toValue: hot ? 1.2 : 1, bounciness: 8, speed: 20, useNativeDriver: true }).start();
  }, [grow, hot]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.target,
        hot && styles.hot,
        {
          left: center.x - SIZE / 2,
          top: center.y - SIZE / 2,
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }, { scale: grow }],
        },
      ]}
    >
      <Icon name="x" color={palette.sheet} size={24} />
    </Animated.View>
  );
}

export function removeTargetCenter(window: { width: number; height: number }, insets: EdgeInsets) {
  return { x: window.width / 2, y: window.height - Math.max(insets.bottom, 16) - SIZE / 2 - 24 };
}

export function isOverRemoveTarget(
  point: { x: number; y: number },
  window: { width: number; height: number },
  insets: EdgeInsets,
) {
  const center = removeTargetCenter(window, insets);
  return Math.hypot(point.x - center.x, point.y - center.y) <= REACH;
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    target: {
      position: "absolute",
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.text,
      boxShadow: palette.floatingShadow,
    },
    hot: { backgroundColor: palette.danger },
  }),
);
