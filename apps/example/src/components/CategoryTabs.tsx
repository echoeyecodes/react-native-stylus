import { ScrollView, StyleSheet, View } from "react-native";
import type { Category } from "../data/menu";
import { colors, spacing } from "../theme";
import { CategoryTab } from "./CategoryTab";

type CategoryTabsProps = {
  categories: Category[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function CategoryTabs({ categories, activeId, onSelect }: CategoryTabsProps) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {categories.map((category) => (
          <CategoryTab
            key={category.id}
            label={category.label}
            active={category.id === activeId}
            onPress={() => onSelect(category.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  row: { paddingHorizontal: spacing.xl, gap: spacing.xxl },
});
