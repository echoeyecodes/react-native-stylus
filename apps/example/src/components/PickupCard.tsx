import { Clock } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { shop } from "../data/shop";
import { colors, radius, spacing, type } from "../theme";

export function PickupCard() {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Clock size={18} strokeWidth={2.2} color={colors.caramel} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>Ready in about {shop.pickupMinutes} min</Text>
        <Text style={styles.detail}>
          {shop.name}, {shop.address}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    backgroundColor: colors.background,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.caramelSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: spacing.xxs },
  title: { ...type.label, color: colors.ink },
  detail: { ...type.caption, color: colors.inkSecondary },
});
