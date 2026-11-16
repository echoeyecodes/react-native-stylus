import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import type { DevicePart } from "../turns";
import { themedStyles } from "../theme";
import { ActivityDetail, ActivityRow } from "./activity";

export function DeviceCheckRow({ part }: { part: DevicePart }) {
  const styles = useStyles();
  const [expanded, setExpanded] = useState(true);

  if (part.status === "running") return <ActivityRow status="running" label="Running on device" />;
  if (part.status === "passed") return <ActivityRow status="done" label="Ran on device" fact="No crashes" />;

  const where = part.location;
  return (
    <>
      <ActivityRow
        status="failed"
        label="Ran on device"
        fact={where ? `Crashed in ${where.name}` : "Crashed"}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
      {expanded && (
        <ActivityDetail>
          <Text selectable style={styles.message}>
            {part.message}
          </Text>
          {where && (
            <Text style={styles.location}>
              {fileName(where.location.file)}, line {where.location.line}
            </Text>
          )}
        </ActivityDetail>
      )}
    </>
  );
}

function fileName(file: string) {
  return file.slice(file.lastIndexOf("/") + 1);
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    message: { color: palette.text, fontSize: 14, lineHeight: 20 },
    location: { color: palette.tertiary, fontSize: 12.5, marginTop: 2 },
  }),
);
