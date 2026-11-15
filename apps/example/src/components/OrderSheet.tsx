import { Wallet } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { customer, shop } from "../data/shop";
import { useOrder } from "../order/order-context";
import { formatPrice } from "../order/order-line";
import { colors, spacing, type } from "../theme";
import { CloseButton } from "./CloseButton";
import { OrderConfirmation, type PlacedOrder } from "./OrderConfirmation";
import { OrderLineRow } from "./OrderLineRow";
import { PickupCard } from "./PickupCard";
import { PrimaryButton } from "./PrimaryButton";
import { Sheet } from "./Sheet";
import { SummaryRow } from "./SummaryRow";

type OrderSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function OrderSheet({ open, onClose }: OrderSheetProps) {
  const order = useOrder();
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  // The confirmation stays while the sheet slides away, and clears the next time it opens.
  useEffect(() => {
    if (open) setPlaced(null);
  }, [open]);

  const place = () => {
    setPlaced({
      number: `D-${String(Date.now()).slice(-4)}`,
      readyAt: new Date(Date.now() + shop.pickupMinutes * 60_000),
      itemCount: order.count,
    });
    order.clear();
  };

  if (placed) {
    return (
      <Sheet open={open} onClose={onClose} footer={<PrimaryButton label="Done" onPress={onClose} />}>
        <OrderConfirmation order={placed} />
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>Your order</Text>
          <CloseButton onPress={onClose} />
        </View>
      }
      footer={
        <PrimaryButton
          label="Place order"
          disabled={order.count === 0}
          trailing={<Text style={styles.buttonTotal}>{formatPrice(order.total)}</Text>}
          onPress={place}
        />
      }
    >
      <View style={styles.content}>
        <PickupCard />
        <View>
          {order.count === 0 && <Text style={styles.empty}>Your order is empty.</Text>}
          {order.lines.map((line) => (
            <OrderLineRow
              key={line.key}
              line={line}
              onQuantityChange={(quantity) => order.setQuantity(line.key, quantity)}
            />
          ))}
        </View>
        <View style={styles.summary}>
          <SummaryRow label="Subtotal" amount={order.subtotal} />
          <SummaryRow label="Tax" amount={order.tax} />
          <View style={styles.divider} />
          <SummaryRow label="Total" amount={order.total} emphasized />
        </View>
        <View style={styles.payment}>
          <Wallet size={18} strokeWidth={2} color={colors.ink} />
          <Text style={styles.paymentLabel}>Paying with {customer.payment}</Text>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.sm,
  },
  title: { ...type.title, color: colors.ink },
  empty: { ...type.body, color: colors.inkSecondary, paddingVertical: spacing.lg },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.lg },
  summary: { gap: spacing.sm, paddingTop: spacing.xs },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: spacing.xs },
  payment: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingTop: spacing.xs },
  paymentLabel: { ...type.bodyStrong, color: colors.ink },
  buttonTotal: { ...type.price, fontSize: 16, color: colors.onEspresso },
});
