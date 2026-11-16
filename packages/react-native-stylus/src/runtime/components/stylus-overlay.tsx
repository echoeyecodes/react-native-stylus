import { useEffect, useState } from "react";
import { Animated, Keyboard, StyleSheet, Text, View } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import { undoTarget, type Turn as TurnData } from "../turns";
import type { Stylus, Target } from "../use-stylus";
import { themedStyles } from "../theme";
import { BeforeScreen } from "./before-screen";
import {
  Composer,
  ComposerField,
  ComposerInput,
  ComposerPath,
  ComposerRow,
  ComposerSubmit,
  ComposerTarget,
} from "./composer";
import { ComposerDock } from "./composer-dock";
import { Highlight } from "./highlight";
import { IconButton } from "./icon-button";
import { PickSurface } from "./pick-surface";
import { PickingBar } from "./picking-bar";
import { SheetBody, SheetFooter, SheetHeader, SheetTitle, StylusSheet, type Detent } from "./stylus-sheet";
import { Turn, TurnFooter, TurnParts, TurnRequest } from "./turn";
import { TurnBanner } from "./turn-banner";

type Props = {
  stylus: Stylus;
  /** How far the app is slid up to keep the picked element above the keyboard. */
  appShift: Animated.Value;
};

export function StylusOverlay({ stylus, appShift }: Props) {
  const styles = useStyles();
  const { state } = stylus;
  const { mode, target, turns } = state;
  const [detent, setDetent] = useState<Detent>("half");
  const [draft, setDraft] = useState("");
  const [comparing, setComparing] = useState(false);
  const [highlightShift] = useState(() => Animated.multiply(appShift, -1));

  const picking = mode === "picking";
  const latest = turns.at(-1) ?? null;
  const running = latest?.status === "running";
  const busy = running || latest?.status === "checking";
  /** Undo is offered on the newest turn that changed files, and nowhere while one is underway. */
  const undoable = busy ? undefined : turns.findLast((turn) => turn.status === "done" || turn.status === "broken");
  const undo = (turn: TurnData) => () => void stylus.undo(undoTarget(turns, turn));

  // The sheet stays mounted while it slides away, and while picking an element for it.
  const sheetWanted = mode === "sheet" || (picking && state.returnTo === "sheet");
  const [sheetMounted, setSheetMounted] = useState(sheetWanted);
  if (sheetWanted && !sheetMounted) setSheetMounted(true);

  useEffect(() => {
    if (state.restore.version > 0) setDraft(state.restore.text);
  }, [state.restore]);

  const composer = (placement: "dock" | "sheet") => (
    <Composer
      draft={draft}
      onDraftChange={setDraft}
      running={running}
      disabled={busy}
      onSend={(text) => {
        if (placement === "dock") Keyboard.dismiss();
        void stylus.send(target, text);
      }}
      onStop={() => latest && stylus.stop(latest)}
    >
      {state.error && <Text style={styles.error}>{state.error}</Text>}
      <ComposerPath
        target={target}
        onSelectLevel={(index) => selectLevel(stylus, target, index)}
        onPick={stylus.start}
      />
      <ComposerRow>
        <ComposerTarget target={target} />
        <ComposerField>
          <ComposerInput
            placeholder="Describe a change"
            autoFocus={placement === "dock"}
            focusKey={placement === "sheet" ? target : undefined}
          />
          <ComposerSubmit />
        </ComposerField>
      </ComposerRow>
    </Composer>
  );

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Renders at once rather than waiting for native to report the insets. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics} pointerEvents="box-none">
        {mode === "banner" && latest?.before && <BeforeScreen screenshot={latest.before} visible={comparing} />}

        {picking && <PickSurface onHover={stylus.hover} onPick={stylus.pick} />}
        {picking && <Highlight frame={state.hover?.frame ?? null} animate={false} />}

        {mode === "composer" && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { transform: [{ translateY: highlightShift }] }]}
            >
              <Highlight frame={target?.frame ?? null} animate={false} />
            </Animated.View>
            <ComposerDock frame={target?.frame ?? null} appShift={appShift} onDismiss={stylus.dismissComposer}>
              {composer("dock")}
            </ComposerDock>
          </>
        )}

        {mode === "banner" && (
          <TurnBanner
            turn={latest}
            error={state.error}
            comparing={comparing}
            onCompare={setComparing}
            onOpen={() => turns.length > 0 && stylus.show("sheet")}
            onDismiss={stylus.close}
            onStop={() => latest && stylus.stop(latest)}
            onUndo={latest && latest === undoable ? undo(latest) : null}
          />
        )}

        {sheetMounted && (
          <StylusSheet
            detent={detent}
            onDetentChange={setDetent}
            onDismiss={() => stylus.show("banner")}
            hidden={mode !== "sheet"}
            onHidden={() => !sheetWanted && setSheetMounted(false)}
          >
            <SheetHeader>
              <SheetTitle title="Stylus" subtitle={status(turns)} busy={busy} />
              <IconButton icon="x" label="Close Stylus" size="small" onPress={stylus.close} />
            </SheetHeader>

            <SheetBody followKey={turns.length}>
              {turns.map((turn) => (
                <Turn
                  key={turn.key}
                  turn={turn}
                  repaired={turns.some((later) => later.repairs === turn.key)}
                  onUndo={turn === undoable ? undo(turn) : null}
                  onFix={turn === latest && turn.status === "broken" && !busy ? stylus.fixCrash : null}
                >
                  <TurnRequest />
                  <TurnParts />
                  <TurnFooter />
                </Turn>
              ))}
            </SheetBody>

            <SheetFooter>{composer("sheet")}</SheetFooter>
          </StylusSheet>
        )}

        {picking && (
          <PickingBar hover={state.hover} message={state.error ?? state.notice} onCancel={stylus.cancelPick} />
        )}
      </SafeAreaProvider>
    </View>
  );
}

function selectLevel(stylus: Stylus, target: Target | null, index: number) {
  if (target) void stylus.selectLevel(target, index);
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
    error: { color: palette.danger, fontSize: 14, lineHeight: 20, paddingHorizontal: 8 },
  }),
);
