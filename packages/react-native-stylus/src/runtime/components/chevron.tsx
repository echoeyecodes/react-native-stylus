import { StyleSheet, Text } from "react-native";
import { themedStyles } from "../theme";

export function Chevron({ expanded }: { expanded: boolean }) {
  const styles = useStyles();
  return <Text style={[styles.chevron, expanded && styles.expanded]}>›</Text>;
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    chevron: { color: palette.tertiary, fontSize: 18, lineHeight: 20, transform: [{ rotate: "90deg" }] },
    expanded: { transform: [{ rotate: "-90deg" }] },
  }),
);
