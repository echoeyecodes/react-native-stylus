import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import type { CheckPart } from "../turns";
import { themedStyles } from "../theme";
import { ActivityDetail, ActivityRow } from "./activity";

export function CheckRow({ part }: { part: CheckPart }) {
  const styles = useStyles();
  const [expanded, setExpanded] = useState(false);
  const failed = part.status === "failed";
  const count = part.problems.length;

  return (
    <>
      <ActivityRow
        status={failed ? "failed" : "done"}
        label="Type check"
        fact={failed ? `${count} ${count === 1 ? "error" : "errors"}` : "No new errors"}
        expanded={expanded}
        onToggle={failed ? () => setExpanded((value) => !value) : undefined}
      />
      {expanded && (
        <ActivityDetail>
          {part.problems.map((problem, index) => (
            <Text key={index} selectable style={styles.problem}>
              {problem}
            </Text>
          ))}
        </ActivityDetail>
      )}
    </>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    problem: { color: palette.secondary, fontSize: 13.5, lineHeight: 20 },
  }),
);
