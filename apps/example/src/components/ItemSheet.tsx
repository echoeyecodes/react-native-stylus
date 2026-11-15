import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { menuItem } from "../data/menu";
import { useOrder } from "../order/order-context";
import { defaultChoices, formatPrice, unitPrice, type Choices } from "../order/order-line";
import { colors, spacing, type } from "../theme";
import { CloseButton } from "./CloseButton";
import { MenuPhoto } from "./MenuPhoto";
import { OptionGroupPicker } from "./OptionGroupPicker";
import { PrimaryButton } from "./PrimaryButton";
import { QuantityStepper } from "./QuantityStepper";
import { Sheet } from "./Sheet";

type ItemSheetProps = {
  /** The item to show, or null when the sheet is closed. */
  itemId: string | null;
  onClose: () => void;
};

export function ItemSheet({ itemId, onClose }: ItemSheetProps) {
  const [shownId, setShownId] = useState(itemId);

  // Keeps the last item on screen while the sheet slides away.
  useEffect(() => {
    if (itemId) setShownId(itemId);
  }, [itemId]);

  if (!shownId) return null;
  return <ItemSheetContent key={shownId} itemId={shownId} open={itemId !== null} onClose={onClose} />;
}

type ItemSheetContentProps = {
  itemId: string;
  open: boolean;
  onClose: () => void;
};

function ItemSheetContent({ itemId, open, onClose }: ItemSheetContentProps) {
  const item = menuItem(itemId);
  const order = useOrder();
  const [choices, setChoices] = useState<Choices>(() => defaultChoices(item));
  const [quantity, setQuantity] = useState(1);
  const total = unitPrice(item, choices) * quantity;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      handle="onPhoto"
      header={
        <View>
          <MenuPhoto itemId={item.id} style={styles.photo} />
          <View style={styles.close}>
            <CloseButton overPhoto onPress={onClose} />
          </View>
        </View>
      }
      footer={
        <View style={styles.footer}>
          <QuantityStepper quantity={quantity} onChange={setQuantity} size="large" />
          <View style={styles.add}>
            <PrimaryButton
              label="Add to order"
              trailing={<Text style={styles.total}>{formatPrice(total)}</Text>}
              onPress={() => {
                order.add(item.id, choices, quantity);
                onClose();
              }}
            />
          </View>
        </View>
      }
    >
      <View style={styles.details}>
        <View style={styles.heading}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
        </View>
        <Text style={styles.description}>{item.description}</Text>
        {item.options.map((group) => (
          <OptionGroupPicker
            key={group.id}
            group={group}
            selectedId={choices[group.id]}
            onSelect={(choiceId) => setChoices((current) => ({ ...current, [group.id]: choiceId }))}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  photo: { width: "100%", height: 300 },
  close: { position: "absolute", top: spacing.lg, right: spacing.lg },
  details: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
  heading: { gap: spacing.xs },
  name: { ...type.title, color: colors.ink },
  price: { ...type.price, fontSize: 17, color: colors.inkSecondary },
  description: { ...type.body, fontSize: 15.5, lineHeight: 23, color: colors.inkSecondary, marginTop: -spacing.sm },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  add: { flex: 1 },
  total: { ...type.price, fontSize: 16, color: colors.onEspresso },
});
