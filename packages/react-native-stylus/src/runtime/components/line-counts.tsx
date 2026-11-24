import { StyleSheet, Text } from "react-native";
import type { LineCounts as Counts } from "../tool-summary";
import { themedStyles } from "../theme";

export function LineCounts({ counts }: { counts: Counts }) {
  const styles = useStyles();
  return (
    <Text style={styles.counts}>
      <Text style={styles.added}>+{counts.added}</Text> <Text style={styles.removed}>−{counts.removed}</Text>
    </Text>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    counts: { fontWeight: "600", fontVariant: ["tabular-nums"] },
    added: { color: palette.added },
    removed: { color: palette.removed },
  }),
);
