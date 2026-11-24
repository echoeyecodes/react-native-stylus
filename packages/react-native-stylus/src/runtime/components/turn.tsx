import { createContext, use, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { segmentParts } from "../turn-segments";
import type { Part, Turn as TurnData } from "../turns";
import { themedStyles } from "../theme";
import { Activity, ActivityRow } from "./activity";
import { Appear } from "./appear";
import { CheckRow } from "./check-row";
import { DeviceCheckRow } from "./device-check-row";
import { IconButton } from "./icon-button";
import { Reasoning } from "./reasoning";
import { Reply } from "./reply";
import { TextButton } from "./text-button";
import { ToolCall } from "./tool-call";

type TurnContextValue = {
  turn: TurnData;
  /** A later turn is repairing this one. */
  repaired: boolean;
  /** Set only on the turn Undo can be offered for. */
  onUndo: (() => void) | null;
  /** Set when the developer can ask for a repair of this turn's crash. */
  onFix: (() => void) | null;
  /** Set when a before screenshot exists; called with true while held. */
  onCompare: ((holding: boolean) => void) | null;
};

const TurnContext = createContext<TurnContextValue | null>(null);

function useTurn() {
  const value = use(TurnContext);
  if (!value) throw new Error("Turn parts must be used inside Turn");
  return value;
}

type Props = TurnContextValue & { children: ReactNode };

export function Turn({ children, ...value }: Props) {
  const styles = useStyles();
  return (
    <TurnContext value={value}>
      <View style={styles.turn}>{children}</View>
    </TurnContext>
  );
}

export function TurnRequest() {
  const styles = useStyles();
  const { turn } = useTurn();

  if (turn.origin === "repair") {
    return (
      <Appear>
        <View style={styles.repair}>
          <Text style={styles.repairTitle}>
            {turn.repairs ? "Fixing the crash this change caused" : "Fixing the crash"}
          </Text>
          <Text selectable numberOfLines={3} style={styles.repairMessage}>
            {turn.request}
          </Text>
        </View>
      </Appear>
    );
  }

  return (
    <Appear>
      <View style={styles.request}>
        <View style={styles.bubble}>
          <Text selectable style={styles.bubbleText}>
            {turn.request}
          </Text>
        </View>
        {turn.target.location.file !== "" && (
          <Text numberOfLines={1} style={styles.target}>
            {turn.target.name} in {fileName(turn.target.location.file)}:{turn.target.location.line}
          </Text>
        )}
      </View>
    </Appear>
  );
}

export function TurnParts() {
  const styles = useStyles();
  const { turn } = useTurn();
  const segments = segmentParts(turn.parts);
  const thinking = turn.status === "running" && segments.length === 0;

  return (
    <View style={styles.parts}>
      {thinking && (
        <Appear>
          <Activity>
            <ActivityRow status="running" label="Thinking" />
          </Activity>
        </Appear>
      )}
      {segments.map((segment) =>
        segment.kind === "text" ? (
          <Appear key={segment.key}>
            <Reply text={segment.part.text} />
          </Appear>
        ) : (
          <Appear key={segment.key}>
            <Activity>{segment.parts.map((part) => step(part))}</Activity>
          </Appear>
        ),
      )}
    </View>
  );
}

function step(part: Exclude<Part, { kind: "text" }>) {
  switch (part.kind) {
    case "reasoning":
      return <Reasoning key={part.id} part={part} />;
    case "tool":
      return <ToolCall key={part.id} part={part} />;
    case "check":
      return <CheckRow key={part.id} part={part} />;
    case "device":
      return <DeviceCheckRow key={part.id} part={part} />;
  }
}

export function TurnFooter() {
  const styles = useStyles();
  const { turn, repaired, onUndo, onFix, onCompare } = useTurn();
  const undo = onUndo && <IconButton icon="undo" label="Undo" tone="plain" size="small" onPress={onUndo} />;
  const compare = onCompare && (
    <IconButton
      icon="compare"
      label="Hold to see the app before this change"
      tone="plain"
      size="small"
      onPressIn={() => onCompare(true)}
      onPressOut={() => onCompare(false)}
    />
  );

  switch (turn.status) {
    case "queued":
      return <Text style={styles.status}>Waiting for the change before it to finish.</Text>;
    case "running":
    case "checking":
      return null;
    case "done":
      return undo || compare ? (
        <View style={styles.footer}>
          {compare}
          {undo}
        </View>
      ) : null;
    case "broken":
      if (repaired) return null;
      return (
        <View style={styles.broken}>
          <Text style={styles.status}>
            {turn.origin === "repair"
              ? "Still crashing after the fix. Undo puts the files back to how they were before your request."
              : "The app was already crashing before this change."}
          </Text>
          <View style={styles.footer}>
            {onFix && <TextButton label="Fix it" tone="link" onPress={onFix} />}
            {undo}
          </View>
        </View>
      );
    case "stopped":
      return <Text style={styles.status}>Stopped. Its edits were put back.</Text>;
    case "undone":
      return <Text style={styles.status}>Undone.</Text>;
    case "failed":
      return <Text style={styles.error}>{turn.error}</Text>;
  }
}

function fileName(file: string) {
  return file.slice(file.lastIndexOf("/") + 1);
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    turn: { gap: 12 },
    request: { alignItems: "flex-end", gap: 6, paddingLeft: 48 },
    bubble: {
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 20,
      borderBottomRightRadius: 6,
      borderCurve: "continuous",
      backgroundColor: palette.accent,
    },
    bubbleText: { color: palette.onAccent, fontSize: 15.5, lineHeight: 22 },
    target: { color: palette.tertiary, fontSize: 12, paddingRight: 4 },
    repair: { gap: 2, paddingHorizontal: 4 },
    repairTitle: { color: palette.text, fontSize: 14.5, fontWeight: "600" },
    repairMessage: { color: palette.secondary, fontSize: 14, lineHeight: 20 },
    parts: { gap: 12 },
    broken: { gap: 6 },
    footer: { flexDirection: "row", alignItems: "center", gap: 16, marginLeft: -3 },
    status: { color: palette.tertiary, fontSize: 13.5, lineHeight: 19 },
    error: { color: palette.danger, fontSize: 14, lineHeight: 20 },
  }),
);
