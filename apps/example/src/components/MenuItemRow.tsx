import { StyleSheet, Text, View } from "react-native";
import type { MenuItem } from "../data/menu";
import { colors, spacing, type } from "../theme";
import { AddButton } from "./AddButton";
import { MenuThumbnail } from "./MenuThumbnail";
import { PriceLabel } from "./PriceLabel";

type MenuItemRowProps = {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
};

export function MenuItemRow({ item, quantity, onAdd }: MenuItemRowProps) {
  return (
    <View style={styles.row}>
      <MenuThumbnail name={item.name} tint={item.tint} />
      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
        <View style={styles.meta}>
          <PriceLabel amount={item.price} style={styles.price} />
          {quantity > 0 && <Text style={styles.quantity}>{quantity} in order</Text>}
        </View>
      </View>
      <AddButton onPress={onAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...type.itemName,
    fontSize: 18,
    color: colors.text,
  },
  description: {
    ...type.body,
    color: colors.textSecondary,
  },
  meta: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  price: {
    ...type.price,
    color: colors.text,
  },
  quantity: {
    ...type.caption,
    color: colors.accent,
  },
});
