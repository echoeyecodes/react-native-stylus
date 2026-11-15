import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, type } from "../theme";

type PrimaryButtonProps = {
  label: string;
  /** Shown at the far end of the button, such as a total. */
  trailing?: ReactNode;
  disabled?: boolean;
  onPress: () => void;
};

export function PrimaryButton({ label, trailing, disabled = false, onPress }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        trailing ? styles.split : styles.centered,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    backgroundColor: colors.espresso,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  split: { justifyContent: "space-between" },
  centered: { justifyContent: "center" },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  label: { ...type.label, fontSize: 16, color: colors.onEspresso },
});
