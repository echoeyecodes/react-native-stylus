import { useEffect, useRef, type ReactNode } from "react";
import { Animated, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { motion, themedStyles } from "../theme";

export function PanelCard({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 260, easing: motion.easeOut, useNativeDriver: true }).start();
  }, [enter]);

  return (
    <KeyboardAvoidingView
      pointerEvents="box-none"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.dock}
    >
      <Animated.View
        style={[
          styles.card,
          {
            marginBottom: Math.max(insets.bottom, 12),
            opacity: enter,
            transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    dock: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", paddingHorizontal: 10 },
    card: {
      gap: 12,
      padding: 14,
      borderRadius: 24,
      borderCurve: "continuous",
      backgroundColor: palette.sheet,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.sheetBorder,
      boxShadow: palette.sheetShadow,
    },
  }),
);
