import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import type { Rect } from "../../shared/protocol";
import { motion, themedStyles } from "../theme";

type Props = {
  frame: Rect | null;
  /** Off while dragging, so the box tracks the finger exactly. */
  animate: boolean;
};

export function Highlight({ frame, animate }: Props) {
  const styles = useStyles();
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const width = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(0)).current;
  const visible = useRef(false);

  useEffect(() => {
    if (!frame) {
      visible.current = false;
      return;
    }
    const targets: [Animated.Value, number][] = [
      [x, frame.x],
      [y, frame.y],
      [width, frame.width],
      [height, frame.height],
    ];
    if (animate && visible.current) {
      Animated.parallel(
        targets.map(([value, toValue]) =>
          Animated.timing(value, { toValue, duration: 220, easing: motion.easeOut, useNativeDriver: false }),
        ),
      ).start();
    } else {
      for (const [value, toValue] of targets) value.setValue(toValue);
    }
    visible.current = true;
  }, [frame, animate, x, y, width, height]);

  if (!frame) return null;
  return <Animated.View pointerEvents="none" style={[styles.box, { left: x, top: y, width, height }]} />;
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    box: {
      position: "absolute",
      borderWidth: 2,
      borderColor: palette.accent,
      backgroundColor: palette.accentSoft,
      borderRadius: 6,
    },
  }),
);
