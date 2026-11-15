import { ShoppingBag } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOrder } from "../order/order-context";
import { formatPrice } from "../order/order-line";
import { colors, radius, shadows, spacing, type } from "../theme";

type OrderBarProps = {
  onPress: () => void;
};

/** Floats over the menu once the order has something in it. */
export function OrderBar({ onPress }: OrderBarProps) {
  const insets = useSafeAreaInsets();
  const { count, subtotal } = useOrder();
  const shown = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shown, {
      toValue: count > 0 ? 1 : 0,
      duration: 320,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
      useNativeDriver: true,
    }).start();
  }, [count, shown]);

  return (
    <Animated.View
      pointerEvents={count > 0 ? "auto" : "none"}
      style={[
        styles.dock,
        {
          bottom: Math.max(insets.bottom, spacing.lg),
          opacity: shown,
          transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
      >
        <View style={styles.bag}>
          <ShoppingBag size={18} strokeWidth={2.2} color={colors.onEspresso} />
          <Text style={styles.count}>{count}</Text>
        </View>
        <Text style={styles.label}>View order</Text>
        <Text style={styles.total}>{formatPrice(subtotal)}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: { position: "absolute", left: spacing.xl, right: spacing.xl },
  bar: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    backgroundColor: colors.espresso,
    boxShadow: shadows.floating,
  },
  pressed: { transform: [{ scale: 0.985 }] },
  bag: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  count: { ...type.label, color: colors.onEspresso, fontVariant: ["tabular-nums"] },
  label: { ...type.label, flex: 1, fontSize: 16, color: colors.onEspresso },
  total: { ...type.price, fontSize: 16, color: colors.onEspresso },
});
