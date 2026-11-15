import { useEffect, useRef } from "react";
import { Animated, type StyleProp, type TextStyle } from "react-native";
import { motion } from "../theme";

type Props = {
  children: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/** Marks work in progress. */
export function PulsingText({ children, style, numberOfLines }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 800, easing: motion.easeInOut, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, easing: motion.easeInOut, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.Text numberOfLines={numberOfLines} style={[style, { opacity }]}>
      {children}
    </Animated.Text>
  );
}
