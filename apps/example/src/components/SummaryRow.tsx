import { StyleSheet, Text, View } from "react-native";
import { formatPrice } from "../order/order-line";
import { colors, type } from "../theme";

type SummaryRowProps = {
  label: string;
  amount: number;
  emphasized?: boolean;
};

export function SummaryRow({ label, amount, emphasized = false }: SummaryRowProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, emphasized && styles.emphasized]}>{label}</Text>
      <Text style={[styles.amount, emphasized && styles.emphasized]}>{formatPrice(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  label: { ...type.body, color: colors.inkSecondary },
  amount: { ...type.body, color: colors.ink, fontVariant: ["tabular-nums"] },
  emphasized: { ...type.label, fontSize: 17, color: colors.ink },
});
