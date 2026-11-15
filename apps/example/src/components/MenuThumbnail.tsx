import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../theme";

type MenuThumbnailProps = {
  name: string;
  tint: string;
};

export function MenuThumbnail({ name, tint }: MenuThumbnailProps) {
  return (
    <View style={[styles.container, { backgroundColor: tint }]}>
      <Text style={styles.initial}>{name.charAt(0)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    opacity: 0.55,
  },
});
