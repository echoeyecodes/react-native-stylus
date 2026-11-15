import { useEffect, useRef } from "react";
import { Animated, StyleSheet, type GestureResponderEvent } from "react-native";
import { motion, themedStyles } from "../theme";

type Point = { x: number; y: number };

type Props = {
  onHover: (point: Point) => void;
  onPick: (point: Point) => void;
};

export function PickSurface({ onHover, onPick }: Props) {
  const styles = useStyles();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, easing: motion.easeOut, useNativeDriver: true }).start();
  }, [opacity]);

  const pointOf = (event: GestureResponderEvent): Point => ({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.dim, { opacity }]}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(event) => onHover(pointOf(event))}
      onResponderMove={(event) => onHover(pointOf(event))}
      onResponderRelease={(event) => onPick(pointOf(event))}
    />
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    dim: { backgroundColor: palette.dim },
  }),
);
