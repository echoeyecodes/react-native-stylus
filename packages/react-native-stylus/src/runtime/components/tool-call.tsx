import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { DiffHunk } from "../../shared/protocol";
import { countChanges, describeTool } from "../tool-summary";
import type { ToolPart } from "../turns";
import { themedStyles } from "../theme";
import { ActivityDetail, ActivityRow } from "./activity";
import { LineCounts } from "./line-counts";

export function ToolCall({ part }: { part: ToolPart }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <ActivityRow
        status={part.status}
        label={describeTool(part.name, part.detail, part.status === "running")}
        fact={part.diff ? <LineCounts counts={countChanges(part.diff)} /> : part.status === "failed" ? "Failed" : null}
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

function lineStyle(styles: ReturnType<typeof useStyles>, line: string) {
  if (line.startsWith("+")) return styles.lineAdded;
  if (line.startsWith("-")) return styles.lineRemoved;
  return null;
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    diff: {
      gap: 10,
      paddingVertical: 10,
      borderRadius: 12,
      borderCurve: "continuous",
      backgroundColor: palette.surface,
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
