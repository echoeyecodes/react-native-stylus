import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, type } from "../theme";

type AddButtonProps = {
  onPress: () => void;
};

export function AddButton({ onPress }: AddButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>Add</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 34,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    ...type.button,
    fontSize: 14,
    color: colors.accent,
  },
});
