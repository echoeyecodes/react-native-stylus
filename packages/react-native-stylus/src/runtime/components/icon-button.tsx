import { Pressable, StyleSheet, Text } from "react-native";
import { themedStyles } from "../theme";

type Props = {
  glyph: string;
  label: string;
  onPress: () => void;
};

/** A small round button for secondary actions, such as closing. */
export function IconButton({ glyph, label, onPress }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.glyph}>{glyph}</Text>
    </Pressable>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    button: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surface,
    },
    pressed: { opacity: 0.6, transform: [{ scale: 0.95 }] },
    glyph: { color: palette.secondary, fontSize: 13, fontWeight: "700" },
  }),
);
