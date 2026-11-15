import { X } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import { colors } from "../theme";

type CloseButtonProps = {
  onPress: () => void;
  /** Over a photo the button gets a solid backing so it stays visible. */
  overPhoto?: boolean;
};

export function CloseButton({ onPress, overPhoto = false }: CloseButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, overPhoto && styles.overPhoto, pressed && styles.pressed]}
    >
      <X size={18} strokeWidth={2.4} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  overPhoto: { backgroundColor: "rgba(255, 255, 255, 0.92)" },
  pressed: { opacity: 0.7 },
});
