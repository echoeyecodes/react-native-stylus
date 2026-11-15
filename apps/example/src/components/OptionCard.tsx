import { Pressable, StyleSheet, Text, View } from "react-native";
import type { OptionChoice } from "../data/options";
import { formatPrice } from "../order/order-line";
import { colors, radius, spacing, type } from "../theme";

type OptionCardProps = {
  choice: OptionChoice;
  selected: boolean;
  onPress: () => void;
};

export function OptionCard({ choice, selected, onPress }: OptionCardProps) {
  const extra = choice.priceDelta > 0 ? `+${formatPrice(choice.priceDelta)}` : null;
  const detail = [choice.detail, extra].filter(Boolean).join(" · ");

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <Text style={styles.label}>{choice.label}</Text>
        {detail !== "" && <Text style={styles.detail}>{detail}</Text>}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.dot} />}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderCurve: "continuous",
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.espresso },
  pressed: { backgroundColor: colors.surfaceMuted },
  text: { flex: 1, gap: 1 },
  label: { ...type.bodyStrong, color: colors.ink },
  detail: { ...type.caption, color: colors.inkSecondary },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.inkTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.espresso, backgroundColor: colors.espresso },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.onEspresso },
});
