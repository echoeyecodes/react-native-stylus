import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoryTabs } from "../components/CategoryTabs";
import { Greeting } from "../components/Greeting";
import { HomeHeader } from "../components/HomeHeader";
import { ItemSheet } from "../components/ItemSheet";
import { MenuItemRow } from "../components/MenuItemRow";
import { OrderBar } from "../components/OrderBar";
import { OrderSheet } from "../components/OrderSheet";
import { PhotoCard } from "../components/PhotoCard";
import { SectionTitle } from "../components/SectionTitle";
import { UsualCard } from "../components/UsualCard";
import { categories, menu, menuItem, type MenuItem } from "../data/menu";
import { customer, stories } from "../data/shop";
import { useOrder } from "../order/order-context";
import { defaultChoices } from "../order/order-line";
import { colors, spacing } from "../theme";

/** The position of the category tabs among the scroll view's children, so they stick under the status bar. */
const TABS_INDEX = 7;

export function MenuScreen() {
  const insets = useSafeAreaInsets();
  const order = useOrder();
  const [categoryId, setCategoryId] = useState(categories[0]!.id);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);

  const quantities = new Map<string, number>();
  for (const line of order.lines) quantities.set(line.itemId, (quantities.get(line.itemId) ?? 0) + line.quantity);
  const quickAdd = (item: MenuItem) => order.add(item.id, defaultChoices(item));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        stickyHeaderIndices={[TABS_INDEX]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <HomeHeader />
        <Greeting />
        <View style={styles.featured}>
          <PhotoCard {...stories.featured} onPress={() => setOpenItemId(stories.featured.itemId)} />
        </View>
        <SectionTitle>Your usuals</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.usuals}>
          {customer.usuals.map((id) => {
            const item = menuItem(id);
            return <UsualCard key={id} item={item} onOpen={() => setOpenItemId(id)} onAdd={() => quickAdd(item)} />;
          })}
        </ScrollView>
        <View style={styles.roastery}>
          <PhotoCard {...stories.roastery} onPress={() => setOpenItemId(stories.roastery.itemId)} />
        </View>
        <SectionTitle>Menu</SectionTitle>
        <CategoryTabs categories={categories} activeId={categoryId} onSelect={setCategoryId} />
        {menu
          .filter((item) => item.categoryId === categoryId)
          .map((item) => (
            <MenuItemRow
              key={item.id}
              item={item}
              quantity={quantities.get(item.id) ?? 0}
              onOpen={() => setOpenItemId(item.id)}
              onAdd={() => quickAdd(item)}
            />
          ))}
      </ScrollView>

      <OrderBar onPress={() => setOrderOpen(true)} />
      <ItemSheet itemId={openItemId} onClose={() => setOpenItemId(null)} />
      <OrderSheet open={orderOpen} onClose={() => setOrderOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 120 },
  featured: { marginTop: spacing.xl },
  roastery: { marginTop: spacing.xxl },
  usuals: { paddingHorizontal: spacing.xl, gap: spacing.lg },
});
