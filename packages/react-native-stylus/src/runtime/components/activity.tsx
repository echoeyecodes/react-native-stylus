import { Children, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { themedStyles } from "../theme";
import { Chevron } from "./chevron";
import { PulsingText } from "./pulsing-text";

export type ActivityStatus = "running" | "done" | "failed";

/** The steps Claude took, one line each. */
export function Activity({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const rows = Children.toArray(children);
  return (
    <View>
      {rows.map((row, index) => (
        <View key={index}>
          {index > 0 && <View style={styles.divider} />}
          {row}
        </View>
      ))}
    </View>
  );
}

type ActivityRowProps = {
  /** Finished steps recede, the running one reads strongest, and a failed one turns red. */
  status: ActivityStatus;
  label: string;
  /** The step's result, at the end of the line, such as "+3 −1" or "No new errors". */
  fact?: ReactNode;
  expanded?: boolean;
  /** Set when the row has details to show. */
  onToggle?: () => void;
};

export function ActivityRow({ status, label, fact, expanded = false, onToggle }: ActivityRowProps) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole={onToggle ? "button" : undefined}
      accessibilityState={onToggle ? { expanded } : undefined}
      disabled={!onToggle}
      onPress={onToggle}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {status === "running" ? (
        <PulsingText numberOfLines={1} style={[styles.label, styles.running]}>
          {label}
        </PulsingText>
      ) : (
        <Text numberOfLines={1} style={[styles.label, status === "failed" && styles.failed]}>
          {label}
        </Text>
      )}
      {fact != null && (
        <Text numberOfLines={1} style={[styles.fact, status === "failed" && styles.failed]}>
          {fact}
        </Text>
      )}
      {onToggle && <Chevron expanded={expanded} />}
    </Pressable>
  );
}

/** Content revealed under a row. */
export function ActivityDetail({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.detail}>{children}</View>;
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.divider },
    row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 36, paddingHorizontal: 4 },
    pressed: { opacity: 0.6 },
    label: { flex: 1, color: palette.secondary, fontSize: 14.5 },
    running: { color: palette.text, fontWeight: "600" },
    failed: { color: palette.danger },
    fact: { flexShrink: 1, color: palette.tertiary, fontSize: 13.5 },
    detail: { paddingHorizontal: 4, paddingBottom: 12 },
  }),
);
