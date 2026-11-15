import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import type { ReasoningPart } from "../turns";
import { themedStyles } from "../theme";
import { ActivityDetail, ActivityRow } from "./activity";

export function Reasoning({ part }: { part: ReasoningPart }) {
  const styles = useStyles();
  const [expanded, setExpanded] = useState(false);
  const thinking = part.endedAt === null;
  const text = part.text.trim();

  return (
    <>
      <ActivityRow
        status={thinking ? "running" : "done"}
        label={thinking ? "Thinking" : `Thought for ${seconds(part)}`}
        expanded={expanded}
        onToggle={!thinking && text ? () => setExpanded((value) => !value) : undefined}
      />
      {expanded && (
        <ActivityDetail>
          <Text selectable style={styles.text}>
            {text}
          </Text>
        </ActivityDetail>
      )}
    </>
  );
}

function seconds(part: ReasoningPart) {
  const elapsed = Math.max(1, Math.round(((part.endedAt ?? part.startedAt) - part.startedAt) / 1000));
  return `${elapsed}s`;
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    text: { color: palette.secondary, fontSize: 14, lineHeight: 20 },
  }),
);
