import { Children, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { themedStyles, usePalette } from "../theme";
import { Chevron } from "./chevron";
import { PulsingText } from "./pulsing-text";

export type ActivityStatus = "running" | "done" | "failed";

/** A card holding the steps Claude took, one row each. */
export function Activity({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const rows = Children.toArray(children);
  return (
    <View style={styles.card}>
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
  status: ActivityStatus;
  label: string;
  /** Shown at the end of the row, such as the size of an edit. */
  trailing?: ReactNode;
  expanded?: boolean;
  /** Set when the row has details to show. */
  onToggle?: () => void;
  /** Said after a failed step's label. Null when the label already says what went wrong. */
  failureText?: string | null;
};

export function ActivityRow({
  status,
  label,
  trailing,
  expanded = false,
  onToggle,
  failureText = "Failed",
}: ActivityRowProps) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole={onToggle ? "button" : undefined}
      accessibilityState={onToggle ? { expanded } : undefined}
      disabled={!onToggle}
      onPress={onToggle}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <StatusMark status={status} />
      {status === "running" ? (
        <PulsingText numberOfLines={1} style={[styles.label, styles.labelRunning]}>
          {label}
        </PulsingText>
      ) : (
        <Text numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      )}
      {trailing}
      {status === "failed" && failureText && <Text style={styles.failed}>{failureText}</Text>}
      {onToggle && <Chevron expanded={expanded} />}
    </Pressable>
  );
}

/** Content revealed under a row, lined up with its label. */
export function ActivityDetail({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.detail}>{children}</View>;
}

function StatusMark({ status }: { status: ActivityStatus }) {
  const styles = useStyles();
  const palette = usePalette();
  return (
    <View style={styles.mark}>
      {status === "running" && <ActivityIndicator size="small" color={palette.tertiary} style={styles.spinner} />}
      {status === "done" && <Text style={styles.done}>✓</Text>}
      {status === "failed" && <Text style={styles.error}>!</Text>}
    </View>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    card: {
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: palette.surface,
      paddingVertical: 2,
    },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.divider, marginLeft: 42 },
    row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 40, paddingHorizontal: 12 },
    pressed: { opacity: 0.6 },
    mark: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
    spinner: { transform: [{ scale: 0.75 }] },
    done: { color: palette.success, fontSize: 14, fontWeight: "700" },
    error: { color: palette.danger, fontSize: 15, fontWeight: "800" },
    label: { flex: 1, color: palette.secondary, fontSize: 14.5 },
    labelRunning: { color: palette.text },
    failed: { color: palette.danger, fontSize: 13 },
    detail: { paddingLeft: 42, paddingRight: 12, paddingBottom: 12 },
  }),
);
