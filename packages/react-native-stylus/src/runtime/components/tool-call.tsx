import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { DiffHunk, ToolName } from "../../shared/protocol";
import type { ToolPart } from "../turns";
import { themedStyles } from "../theme";
import { ActivityDetail, ActivityRow } from "./activity";

export function ToolCall({ part }: { part: ToolPart }) {
  const styles = useStyles();
  const [expanded, setExpanded] = useState(false);
  const counts = part.diff ? countChanges(part.diff) : null;

  return (
    <>
      <ActivityRow
        status={part.status}
        label={describe(part.name, part.detail, part.status === "running")}
        trailing={
          counts && (
            <Text style={styles.counts}>
              <Text style={styles.added}>+{counts.added}</Text>
              {"  "}
              <Text style={styles.removed}>−{counts.removed}</Text>
            </Text>
          )
        }
        expanded={expanded}
        onToggle={part.diff ? () => setExpanded((value) => !value) : undefined}
      />
      {expanded && part.diff && (
        <ActivityDetail>
          <Diff hunks={part.diff} />
        </ActivityDetail>
      )}
    </>
  );
}

function Diff({ hunks }: { hunks: DiffHunk[] }) {
  const styles = useStyles();
  return (
    <View style={styles.diff}>
      {hunks.map((hunk) => (
        <View key={`${hunk.oldStart}:${hunk.newStart}`} style={styles.hunk}>
          <Text style={styles.hunkTitle}>Line {hunk.newStart}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.lines}>
              {hunk.lines.map((line, index) => (
                <Text key={index} style={[styles.line, lineStyle(styles, line)]}>
                  {line.slice(1) || " "}
                </Text>
              ))}
            </View>
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

const VERBS: Record<ToolName, { running: string; done: string; fallback: string }> = {
  Read: { running: "Reading", done: "Read", fallback: "a file" },
  Edit: { running: "Editing", done: "Edited", fallback: "a file" },
  Write: { running: "Writing", done: "Wrote", fallback: "a file" },
  Grep: { running: "Searching for", done: "Searched for", fallback: "code" },
  Glob: { running: "Finding", done: "Found", fallback: "files" },
};

function describe(name: ToolName, detail: string | null, running: boolean) {
  const verb = VERBS[name];
  return `${running ? verb.running : verb.done} ${detail ?? verb.fallback}`;
}

function countChanges(diff: DiffHunk[]) {
  let added = 0;
  let removed = 0;
  for (const line of diff.flatMap((hunk) => hunk.lines)) {
    if (line.startsWith("+")) added += 1;
    else if (line.startsWith("-")) removed += 1;
  }
  return { added, removed };
}

function lineStyle(styles: ReturnType<typeof useStyles>, line: string) {
  if (line.startsWith("+")) return styles.lineAdded;
  if (line.startsWith("-")) return styles.lineRemoved;
  return null;
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    counts: { fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] },
    added: { color: palette.added },
    removed: { color: palette.removed },
    diff: {
      gap: 10,
      paddingVertical: 10,
      borderRadius: 12,
      borderCurve: "continuous",
      backgroundColor: palette.sheet,
      overflow: "hidden",
    },
    hunk: { gap: 4 },
    hunkTitle: { color: palette.tertiary, fontSize: 12, fontWeight: "500", paddingHorizontal: 12 },
    lines: { minWidth: "100%" },
    line: { color: palette.secondary, fontSize: 13, lineHeight: 20, paddingHorizontal: 12 },
    lineAdded: { color: palette.added, backgroundColor: palette.addedFill },
    lineRemoved: { color: palette.removed, backgroundColor: palette.removedFill },
  }),
);
