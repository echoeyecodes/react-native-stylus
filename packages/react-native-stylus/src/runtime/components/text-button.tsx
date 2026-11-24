import { Pressable, StyleSheet, Text } from "react-native";
import { themedStyles } from "../theme";

type Props = {
  label: string;
  onPress: () => void;
  /** `link` is accent text with no background, for in-conversation actions. */
  tone?: "plain" | "accent" | "link";
};

export function TextButton({ label, onPress, tone = "plain" }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={tone === "link" ? 8 : 0}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles[tone], pressed && styles.pressed]}
    >
      <Text style={[styles.label, tone === "accent" && styles.labelAccent, tone === "link" && styles.labelLink]}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    button: {
      height: 34,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderCurve: "continuous",
      justifyContent: "center",
    },
    plain: { backgroundColor: palette.surface },
    accent: { backgroundColor: palette.accent },
    link: { height: 24, paddingHorizontal: 0 },
    pressed: { opacity: 0.6, transform: [{ scale: 0.97 }] },
    label: { color: palette.text, fontSize: 15, fontWeight: "600" },
    labelAccent: { color: palette.onAccent },
    labelLink: { color: palette.accent, fontSize: 14.5 },
  }),
);
