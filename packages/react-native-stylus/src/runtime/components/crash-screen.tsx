import { DevSettings, StyleSheet, Text, View } from "react-native";
import { themedStyles } from "../theme";
import { TextButton } from "./text-button";

type Props = {
  error: Error;
  /** Hidden while Stylus is already working on a fix. */
  onFix: (() => void) | null;
};

export function CrashScreen({ error, onFix }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>This screen crashed</Text>
      <Text selectable style={styles.message}>
        {error.message}
      </Text>
      <View style={styles.actions}>
        <TextButton label="Reload" onPress={() => DevSettings.reload()} />
        {onFix && <TextButton label="Fix with Stylus" tone="accent" onPress={onFix} />}
      </View>
    </View>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 10,
      backgroundColor: palette.sheet,
    },
    title: { color: palette.text, fontSize: 20, fontWeight: "600", letterSpacing: -0.3 },
    message: { color: palette.secondary, fontSize: 15, lineHeight: 22 },
    actions: { flexDirection: "row", gap: 10, marginTop: 10 },
  }),
);
