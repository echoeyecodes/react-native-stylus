import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import { undoTarget, type Turn as TurnData } from "../turns";
import type { Stylus } from "../use-stylus";
import { themedStyles } from "../theme";
import { Composer, ComposerField, ComposerInput, ComposerSubmit, ComposerTarget } from "./composer";
import { Highlight } from "./highlight";
import { IconButton } from "./icon-button";
import { PickSurface } from "./pick-surface";
import { PickingBar } from "./picking-bar";
import { SheetBody, SheetFooter, SheetHeader, SheetTitle, StylusSheet, type Detent } from "./stylus-sheet";
import { Turn, TurnFooter, TurnParts, TurnRequest } from "./turn";

export function StylusOverlay({ stylus }: { stylus: Stylus }) {
  const styles = useStyles();
  const { state } = stylus;
  const [detent, setDetent] = useState<Detent>("compact");
  const picking = state.mode === "picking";
  const target = state.target;
  const turns = state.turns;
  const latest = turns.at(-1);
  const running = latest?.status === "running";
  const busy = running || latest?.status === "checking";
  /** Undo is offered on the newest turn that changed files, and nowhere while one is underway. */
  const undoable = busy ? undefined : turns.findLast((turn) => turn.status === "done" || turn.status === "broken");

  // A new turn, including a repair Stylus starts by itself, should be visible as it runs.
  useEffect(() => {
    if (turns.length > 0) setDetent((current) => (current === "compact" ? "half" : current));
  }, [turns.length]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Renders at once rather than waiting for native to report the insets. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics} pointerEvents="box-none">
        {picking && <PickSurface onHover={stylus.hover} onPick={stylus.pick} />}
        {picking && <Highlight frame={state.hover?.frame ?? null} animate={false} />}

        {(target || turns.length > 0) && (
          <StylusSheet detent={detent} onDetentChange={setDetent} expandable={turns.length > 0} hidden={picking}>
            <SheetHeader>
              <SheetTitle title="Stylus" subtitle={status(turns)} busy={busy} />
              <IconButton glyph="✕" label="Close Stylus" onPress={stylus.close} />
            </SheetHeader>

            <SheetBody followKey={turns.length}>
              {turns.map((turn) => (
                <Turn
                  key={turn.key}
                  turn={turn}
                  repaired={turns.some((later) => later.repairs === turn.key)}
                  onUndo={turn === undoable ? () => stylus.undo(undoTarget(turns, turn)) : null}
                  onFix={turn === latest && turn.status === "broken" && !busy ? stylus.fixCrash : null}
                >
                  <TurnRequest />
                  <TurnParts />
                  <TurnFooter />
                </Turn>
              ))}
            </SheetBody>

            <SheetFooter>
              {state.error && <Text style={styles.error}>{state.error}</Text>}
              <Composer
                restore={state.restore}
                running={running}
                disabled={busy}
                onSend={(text) => void stylus.send(target, text)}
                onStop={() => latest && stylus.stop(latest)}
              >
                <ComposerTarget
                  target={target}
                  onSelectLevel={(index) => target && stylus.selectLevel(target, index)}
                  onChange={stylus.start}
                />
                <ComposerField>
                  <ComposerInput placeholder="Describe a change" focusKey={target ?? undefined} />
                  <ComposerSubmit />
                </ComposerField>
              </Composer>
            </SheetFooter>
          </StylusSheet>
        )}

        {picking && (
          <PickingBar hover={state.hover} message={state.error ?? state.notice} onCancel={stylus.cancelPick} />
        )}
      </SafeAreaProvider>
    </View>
  );
}

function status(turns: TurnData[]) {
  const latest = turns.at(-1);
  if (latest?.status === "running") return "Working on it";
  if (latest?.status === "checking") return "Checking on device";
  if (latest?.status === "broken") return "The app is crashing";
  const changes = turns.filter((turn) => turn.status === "done" && turn.lastEditAt !== null).length;
  if (changes === 0) return "No changes yet";
  return changes === 1 ? "1 change" : `${changes} changes`;
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    error: { color: palette.danger, fontSize: 14, lineHeight: 20, paddingHorizontal: 8, paddingBottom: 8 },
  }),
);
