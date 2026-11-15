import { Check } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { shop } from "../data/shop";
import { colors, radius, spacing, type } from "../theme";

export type PlacedOrder = {
  number: string;
  readyAt: Date;
  itemCount: number;
};

export function OrderConfirmation({ order }: { order: PlacedOrder }) {
  const readyAt = order.readyAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <View style={styles.confirmation}>
      <View style={styles.check}>
        <Check size={34} strokeWidth={2.6} color={colors.onEspresso} />
      </View>
      <Text style={styles.title}>Order placed</Text>
      <Text style={styles.body}>
        Your {order.itemCount === 1 ? "item" : `${order.itemCount} items`} will be ready at {readyAt} at {shop.location}
        .
      </Text>
      <View style={styles.receipt}>
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Order</Text>
          <Text style={styles.receiptValue}>{order.number}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Pickup</Text>
          <Text style={styles.receiptValue}>{shop.address}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  confirmation: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  check: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: { ...type.title, color: colors.ink },
  body: {
    ...type.body,
    fontSize: 15.5,
    lineHeight: 23,
    color: colors.inkSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  receipt: {
    alignSelf: "stretch",
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    backgroundColor: colors.background,
  },
  receiptRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.lg },
  receiptLabel: { ...type.body, color: colors.inkSecondary },
  receiptValue: { ...type.bodyStrong, color: colors.ink },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
});
