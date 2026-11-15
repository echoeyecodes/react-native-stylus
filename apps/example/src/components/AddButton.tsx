import { Plus } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import { colors } from "../theme";

type AddButtonProps = {
  label: string;
  onPress: () => void;
};

export function AddButton({ label, onPress }: AddButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Plus size={18} strokeWidth={2.4} color={colors.onEspresso} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.espresso,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.92 }] },
});
