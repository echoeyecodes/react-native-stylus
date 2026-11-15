import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../theme";

type CategoryTabProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export function CategoryTab({ label, active, onPress }: CategoryTabProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={8}
      style={styles.tab}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      <View style={[styles.underline, active && styles.underlineActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: { paddingTop: spacing.md, gap: spacing.md },
  label: { ...type.label, color: colors.inkTertiary },
  labelActive: { color: colors.ink },
  underline: { height: 2, borderRadius: 1 },
  underlineActive: { backgroundColor: colors.espresso },
});
