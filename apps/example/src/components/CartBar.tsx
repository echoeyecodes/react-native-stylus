import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing, type } from "../theme";
import { PriceLabel } from "./PriceLabel";

type CartBarProps = {
  count: number;
  total: number;
  onCheckout: () => void;
};

export function CartBar({ count, total, onCheckout }: CartBarProps) {
  const empty = count === 0;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.summary}>
          <Text style={styles.count}>
            {empty ? "No items yet" : `${count} ${count === 1 ? "item" : "items"}`}
          </Text>
          <PriceLabel amount={total} style={styles.total} />
        </View>
        <Pressable
          onPress={onCheckout}
          disabled={empty}
          style={({ pressed }) => [
            styles.button,
            empty && styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonLabel}>Checkout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  summary: {
    gap: 2,
  },
  count: {
    ...type.caption,
    color: colors.textSecondary,
  },
  total: {
    ...type.total,
    color: colors.text,
  },
  button: {
    height: 48,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    ...type.button,
    color: colors.onAccent,
  },
});
