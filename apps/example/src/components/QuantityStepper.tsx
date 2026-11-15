import { Minus, Plus } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../theme";

type QuantityStepperProps = {
  quantity: number;
  /** The lowest quantity allowed. Lines in an order go to zero to be removed. */
  minimum?: number;
  onChange: (quantity: number) => void;
  size?: "regular" | "large";
};

export function QuantityStepper({ quantity, minimum = 1, onChange, size = "regular" }: QuantityStepperProps) {
  const large = size === "large";
  const iconSize = large ? 18 : 15;
  return (
    <View style={[styles.stepper, large && styles.large]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fewer"
        disabled={quantity <= minimum}
        hitSlop={6}
        onPress={() => onChange(quantity - 1)}
        style={({ pressed }) => [styles.step, large && styles.stepLarge, pressed && styles.pressed]}
      >
        <Minus size={iconSize} strokeWidth={2.4} color={quantity <= minimum ? colors.inkTertiary : colors.ink} />
      </Pressable>
      <Text style={[styles.quantity, large && styles.quantityLarge]}>{quantity}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More"
        hitSlop={6}
        onPress={() => onChange(quantity + 1)}
        style={({ pressed }) => [styles.step, large && styles.stepLarge, pressed && styles.pressed]}
      >
        <Plus size={iconSize} strokeWidth={2.4} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xxs,
  },
  large: { borderRadius: 28, padding: spacing.xs },
  step: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  stepLarge: { width: 44, height: 44, borderRadius: 22 },
  pressed: { backgroundColor: colors.surfacePressed },
  quantity: { ...type.label, minWidth: 22, textAlign: "center", color: colors.ink, fontVariant: ["tabular-nums"] },
  quantityLarge: { fontSize: 17, minWidth: 28 },
});
