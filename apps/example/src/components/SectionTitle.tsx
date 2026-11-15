import { StyleSheet, Text } from "react-native";
import { colors, spacing, type } from "../theme";

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    ...type.headline,
    color: colors.ink,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
});
