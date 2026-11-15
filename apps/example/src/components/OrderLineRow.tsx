import { StyleSheet, Text, View } from "react-native";
import { menuItem } from "../data/menu";
import { describeChoices, unitPrice, type OrderLine } from "../order/order-line";
import { colors, radius, spacing, type } from "../theme";
import { MenuPhoto } from "./MenuPhoto";
import { PriceLabel } from "./PriceLabel";
import { QuantityStepper } from "./QuantityStepper";

type OrderLineRowProps = {
  line: OrderLine;
  onQuantityChange: (quantity: number) => void;
};

export function OrderLineRow({ line, onQuantityChange }: OrderLineRowProps) {
  const item = menuItem(line.itemId);
  const choices = describeChoices(item, line.choices);

  return (
    <View style={styles.row}>
      <MenuPhoto itemId={item.id} style={styles.photo} />
      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        {choices !== "" && <Text style={styles.choices}>{choices}</Text>}
        <PriceLabel amount={unitPrice(item, line.choices) * line.quantity} style={styles.price} />
      </View>
      <QuantityStepper quantity={line.quantity} minimum={0} onChange={onQuantityChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  photo: { width: 60, height: 60, borderRadius: radius.sm, borderCurve: "continuous" },
  details: { flex: 1, gap: spacing.xxs },
  name: { ...type.itemName, fontSize: 15, color: colors.ink },
  choices: { ...type.caption, color: colors.inkSecondary },
  price: { ...type.caption, fontFamily: type.price.fontFamily, color: colors.ink },
});
