import { StyleSheet, Text, View } from "react-native";
import type { OptionGroup } from "../data/options";
import { colors, spacing, type } from "../theme";
import { OptionCard } from "./OptionCard";

type OptionGroupPickerProps = {
  group: OptionGroup;
  selectedId: string | undefined;
  onSelect: (choiceId: string) => void;
};

export function OptionGroupPicker({ group, selectedId, onSelect }: OptionGroupPickerProps) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      <Text style={styles.title}>{group.title}</Text>
      <View style={styles.choices}>
        {group.choices.map((choice) => (
          <OptionCard
            key={choice.id}
            choice={choice}
            selected={choice.id === selectedId}
            onPress={() => onSelect(choice.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  title: { ...type.label, fontSize: 16, color: colors.ink },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
