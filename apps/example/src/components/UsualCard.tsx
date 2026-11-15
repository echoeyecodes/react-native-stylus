import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MenuItem } from "../data/menu";
import { formatPrice } from "../order/order-line";
import { colors, radius, spacing, type } from "../theme";
import { AddButton } from "./AddButton";
import { MenuPhoto } from "./MenuPhoto";
import { PriceLabel } from "./PriceLabel";

type UsualCardProps = {
  item: MenuItem;
  onOpen: () => void;
  onAdd: () => void;
};

export function UsualCard({ item, onOpen, onAdd }: UsualCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatPrice(item.price)}`}
      // The add button sits inside the card, so screen readers reach it as an action on the card.
      accessibilityActions={[{ name: "add", label: "Add to order" }]}
      onAccessibilityAction={(event) => event.nativeEvent.actionName === "add" && onAdd()}
      onPress={onOpen}
      style={styles.card}
    >
      <View>
        <MenuPhoto itemId={item.id} style={styles.photo} />
        <View style={styles.add}>
          <AddButton label={`Add ${item.name}`} onPress={onAdd} />
        </View>
      </View>
      <Text numberOfLines={1} style={styles.name}>
        {item.name}
      </Text>
      <PriceLabel amount={item.price} style={styles.price} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 148, gap: spacing.xxs },
  photo: { width: 148, height: 148, borderRadius: radius.lg, borderCurve: "continuous", marginBottom: spacing.sm },
  add: { position: "absolute", right: spacing.sm, bottom: spacing.lg },
  name: { ...type.itemName, fontSize: 15, color: colors.ink },
  price: { ...type.caption, color: colors.inkSecondary },
});
