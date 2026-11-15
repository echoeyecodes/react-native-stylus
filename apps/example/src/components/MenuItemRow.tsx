import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MenuItem } from "../data/menu";
import { formatPrice } from "../order/order-line";
import { colors, radius, spacing, type } from "../theme";
import { AddButton } from "./AddButton";
import { MenuPhoto } from "./MenuPhoto";
import { PriceLabel } from "./PriceLabel";

type MenuItemRowProps = {
  item: MenuItem;
  quantity: number;
  onOpen: () => void;
  onAdd: () => void;
};

export function MenuItemRow({ item, quantity, onOpen, onAdd }: MenuItemRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        item.name,
        item.description,
        formatPrice(item.price),
        quantity > 0 && `${quantity} in your order`,
      ]
        .filter(Boolean)
        .join(", ")}
      // The add button sits inside the row, so screen readers reach it as an action on the row.
      accessibilityActions={[{ name: "add", label: "Add to order" }]}
      onAccessibilityAction={(event) => event.nativeEvent.actionName === "add" && onAdd()}
      onPress={onOpen}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.meta}>
          <PriceLabel amount={item.price} />
          {quantity > 0 && <Text style={styles.quantity}>{quantity} in your order</Text>}
        </View>
      </View>
      <View>
        <MenuPhoto itemId={item.id} style={styles.photo} />
        <View style={styles.add}>
          <AddButton label={`Add ${item.name}`} onPress={onAdd} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  details: { flex: 1, gap: spacing.xs },
  name: { ...type.itemName, color: colors.ink },
  description: { ...type.body, color: colors.inkSecondary },
  meta: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, marginTop: spacing.xxs },
  quantity: { ...type.captionStrong, color: colors.caramel },
  photo: { width: 96, height: 96, borderRadius: radius.md, borderCurve: "continuous" },
  add: { position: "absolute", right: -6, bottom: -6 },
});
