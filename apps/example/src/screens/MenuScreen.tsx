import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CartBar } from "../components/CartBar";
import { CategoryTabs } from "../components/CategoryTabs";
import { MenuItemRow } from "../components/MenuItemRow";
import { ShopHeader } from "../components/ShopHeader";
import { categories, menu } from "../data/menu";
import { colors, spacing } from "../theme";

type Cart = Record<string, number>;

function greetingForNow() {
  const hour = new Date().getHours();
  const [partOfDay, emoji] =
    hour < 12 ? ["morning", "☀️"] : hour < 17 ? ["afternoon", "😎"] : ["evening", "🌙"];
  return `Good ${partOfDay} ${emoji}. Pickup from Mill Street in about 8 min.`;
}

export function MenuScreen() {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [cart, setCart] = useState<Cart>({});

  const items = menu.filter((item) => item.categoryId === activeCategory);
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const total = menu.reduce((sum, item) => sum + (cart[item.id] ?? 0) * item.price, 0);

  const addItem = (id: string) => {
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  };

  const checkout = () => {
    Alert.alert("Order placed", "We'll have it ready at Mill Street in about 8 minutes.");
    setCart({});
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]} style={styles.main}>
        <ShopHeader name="Daybreak Coffee" greeting={greetingForNow()} />
        <CategoryTabs
          categories={categories}
          activeId={activeCategory}
          onSelect={setActiveCategory}
        />
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((item) => (
            <MenuItemRow
              key={item.id}
              item={item}
              quantity={cart[item.id] ?? 0}
              onAdd={() => addItem(item.id)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
      <CartBar count={count} total={total} onCheckout={checkout} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  main: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
