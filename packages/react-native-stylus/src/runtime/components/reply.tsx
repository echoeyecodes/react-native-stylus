import { StyleSheet, Text } from "react-native";
import { themedStyles } from "../theme";

/** Matches `code` and **bold**, the only markdown short replies tend to use. */
const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;

export function Reply({ text }: { text: string }) {
  const styles = useStyles();
  const segments = text.trim().split(INLINE);
  return (
    <Text selectable style={styles.reply}>
      {segments.map((segment, index) => {
        if (segment.startsWith("`") && segment.endsWith("`") && segment.length > 1) {
          return (
            <Text key={index} style={styles.code}>
              {segment.slice(1, -1)}
            </Text>
          );
        }
        if (segment.startsWith("**") && segment.endsWith("**") && segment.length > 3) {
          return (
            <Text key={index} style={styles.bold}>
              {segment.slice(2, -2)}
            </Text>
          );
        }
        return segment;
      })}
    </Text>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    reply: { color: palette.text, fontSize: 15.5, lineHeight: 23 },
    code: { color: palette.accent, fontWeight: "500" },
    bold: { fontWeight: "600" },
  }),
);
