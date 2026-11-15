import { Image, type ImageSource } from "expo-image";
import { ArrowRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadows, spacing, type } from "../theme";

type PhotoCardProps = {
  image: ImageSource;
  kicker: string;
  title: string;
  action: string;
  onPress: () => void;
};

/** A story told over a full-bleed photo, with one action. */
export function PhotoCard({ image, kicker, title, action, onPress }: PhotoCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image source={image} contentFit="cover" style={StyleSheet.absoluteFill} />
      <View style={styles.scrim} />
      <View style={styles.content}>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.action}>
          <Text style={styles.actionLabel}>{action}</Text>
          <ArrowRight size={16} strokeWidth={2.4} color={colors.ink} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 240,
    marginHorizontal: spacing.xl,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: colors.espresso,
    boxShadow: shadows.card,
  },
  pressed: { transform: [{ scale: 0.985 }] },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(20, 14, 10, 0.4)" },
  content: { padding: spacing.xl, gap: spacing.xs },
  kicker: { ...type.captionStrong, color: "rgba(255, 255, 255, 0.85)" },
  title: { ...type.title, color: "#FFFFFF", maxWidth: 280 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.md,
    height: 38,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: "#FFFFFF",
  },
  actionLabel: { ...type.label, fontSize: 14, color: colors.ink },
});
