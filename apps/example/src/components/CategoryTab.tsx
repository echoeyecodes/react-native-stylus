import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../theme";

type CategoryTabProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export function CategoryTab({ label, active, onPress }: CategoryTabProps) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.tab}>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      <View style={[styles.underline, active && styles.underlineActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  label: {
    ...type.tab,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  labelActive: {
    fontWeight: "600",
    color: colors.text,
  },
  underline: {
    height: 2,
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  underlineActive: {
    backgroundColor: colors.accent,
  },
});
