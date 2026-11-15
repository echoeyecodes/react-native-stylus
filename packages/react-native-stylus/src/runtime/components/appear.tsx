import { useEffect, useRef, type ReactNode } from "react";
import { Animated } from "react-native";
import { motion } from "../theme";

/** Fades and lifts its content in once, when it first mounts. */
export function Appear({ children }: { children: ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 260, easing: motion.easeOut, useNativeDriver: true }).start();
  }, [progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
