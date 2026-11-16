import { Pressable, StyleSheet } from "react-native";
import { themedStyles, usePalette, type Palette } from "../theme";
import { Icon, type IconName } from "./icon";

type Tone = "filled" | "plain" | "accent";

type Props = {
  icon: IconName;
  label: string;
  onPress?: () => void;
  /** With `onPressOut`, makes a button that acts while it is held. */
  onPressIn?: () => void;
  onPressOut?: () => void;
  /** `filled` sits on a surface, `plain` sits inline with text, `accent` is the main action. */
  tone?: Tone;
  size?: "regular" | "small";
  /** Draws the button as held down. */
  active?: boolean;
  disabled?: boolean;
};

/** A round button carrying a single icon. */
export function IconButton({
  icon,
  label,
  onPress,
  onPressIn,
  onPressOut,
  tone = "filled",
  size = "regular",
  active = false,
  disabled = false,
}: Props) {
  const styles = useStyles();
  const palette = usePalette();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={size === "small" ? 8 : 4}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.button,
        styles[size],
        styles[tone],
        active && styles.active,
        disabled && styles.disabled,
        pressed && !active && styles.pressed,
      ]}
    >
      <Icon name={icon} color={iconColor(palette, tone, active)} size={size === "small" ? 16 : 18} />
    </Pressable>
  );
}

function iconColor(palette: Palette, tone: Tone, active: boolean) {
  if (active) return palette.sheet;
  if (tone === "accent") return palette.onAccent;
  if (tone === "plain") return palette.secondary;
  return palette.text;
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    button: { alignItems: "center", justifyContent: "center" },
    regular: { width: 36, height: 36, borderRadius: 18 },
    small: { width: 30, height: 30, borderRadius: 15 },
    filled: { backgroundColor: palette.surface },
    plain: {},
    accent: { backgroundColor: palette.accent },
    active: { backgroundColor: palette.text },
    disabled: { opacity: 0.4 },
    pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  }),
);
