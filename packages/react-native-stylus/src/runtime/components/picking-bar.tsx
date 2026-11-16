import { StyleSheet, Text, View } from "react-native";
import type { Hover } from "../use-stylus";
import { themedStyles } from "../theme";
import { IconButton } from "./icon-button";
import { PanelCard } from "./panel-card";

type Props = {
  hover: Hover | null;
  message: string | null;
  onCancel: () => void;
};

export function PickingBar({ hover, message, onCancel }: Props) {
  const styles = useStyles();
  return (
    <PanelCard>
      <View style={styles.row}>
        <Text numberOfLines={2} style={[styles.text, hover && styles.name]}>
          {hover?.name ?? message ?? "Tap an element to edit it."}
        </Text>
        <IconButton icon="x" label="Cancel" onPress={onCancel} />
      </View>
    </PanelCard>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 4 },
    text: { flex: 1, color: palette.secondary, fontSize: 15 },
    name: { color: palette.text, fontWeight: "600" },
  }),
);
