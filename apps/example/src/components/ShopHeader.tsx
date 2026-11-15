import { Image, StyleSheet, Text, View } from "react-native";
import { colors, spacing, type } from "../theme";

type ShopHeaderProps = {
  name: string;
  greeting: string;
  userName?: string;
};

export function ShopHeader({ name, greeting, userName = "Alex" }: ShopHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.text}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.title}>{name}</Text>
      </View>
      <Image
        source={{ uri: "https://i.pravatar.cc/200?img=12" }}
        accessibilityLabel={userName}
        style={styles.avatar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  text: {
    flex: 1,
    gap: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.accent,
  },
  title: {
    ...type.title,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: colors.text,
  },
  greeting: {
    ...type.caption,
    fontSize: 14,
    color: colors.accent,
    fontWeight: "500",
  },
});
