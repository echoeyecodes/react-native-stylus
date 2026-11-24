import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { initialWindowMetrics, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { threadName, type Thread } from "../threads";
import type { Stylus } from "../use-stylus";
import { BUBBLE_SIZE } from "../use-anchor-positions";
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
import { isOverRemoveTarget, RemoveTarget } from "./remove-target";
import { SheetBody, SheetFooter, SheetHeader, SheetTitle, StylusSheet, type Detent } from "./stylus-sheet";
import { ThreadBubble } from "./thread-bubble";
import { Turn, TurnFooter, TurnParts, TurnRequest } from "./turn";

type Props = {
  stylus: Stylus;
  /** How far the app is slid up to keep the picked element above the keyboard. */
  appShift: Animated.Value;
};

export function StylusOverlay(props: Props) {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Renders at once rather than waiting for native to report the insets. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics} pointerEvents="box-none">
        <Overlay {...props} />
      </SafeAreaProvider>
    </View>
  );
}

function Overlay({ stylus, appShift }: Props) {
  const styles = useStyles();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { state, anchors } = stylus;
  const { mode, target } = state;
  const threads = state.threads.list;
  const picking = mode === "picking";

  const [draft, setDraft] = useState("");
  const [detent, setDetent] = useState<Detent>("half");
  const [comparing, setComparing] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overTarget, setOverTarget] = useState(false);
  const [dropped, setDropped] = useState<ReadonlySet<string>>(new Set());
  const [highlightShift] = useState(() => Animated.multiply(appShift, -1));
  const [corner] = useState(() => new Animated.ValueXY());

  // The sheet keeps its thread while it slides away.
  const [sheetThreadId, setSheetThreadId] = useState(state.openThreadId);
  if (state.openThreadId && state.openThreadId !== sheetThreadId) {
    setSheetThreadId(state.openThreadId);
    setDetent("half");
  }
  const sheetThread = threads.find((thread) => thread.id === sheetThreadId) ?? null;

  useEffect(() => {
    if (state.restore.version > 0) setDraft(state.restore.text);
  }, [state.restore]);

  // Threads without an element rest in the bottom right corner.
  useEffect(() => {
    corner.setValue({
      x: window.width - BUBBLE_SIZE / 2 - 16,
      y: window.height - Math.max(insets.bottom, 16) - BUBBLE_SIZE / 2 - 72,
    });
  }, [corner, window, insets.bottom]);

  const drop = (threadId: string, point: { x: number; y: number }) => {
    setDragging(null);
    setOverTarget(false);
    if (!isOverRemoveTarget(point, window, insets)) return false;
    setDropped((current) => new Set(current).add(threadId));
    stylus.removeThread(threadId);
    return true;
  };

  const composer = (
    <Composer
      draft={draft}
      onDraftChange={setDraft}
      running={false}
      disabled={false}
      onSend={(text) => target && void stylus.ask(target, text)}
      onStop={() => {}}
    >
      {state.error && <Text style={styles.error}>{state.error}</Text>}
      <ComposerPath
        target={target}
        onSelectLevel={(index) => target && void stylus.selectLevel(target, index)}
        onPick={stylus.start}
      />
      <ComposerRow>
        <ComposerTarget target={target} />
        <ComposerField>
          <ComposerInput placeholder="Describe a change" autoFocus />
          <ComposerSubmit />
        </ComposerField>
      </ComposerRow>
    </Composer>
  );

  return (
    <>
      {comparing && <BeforeScreenFor stylus={stylus} turnId={comparing} />}

      {/* Below the bubbles, so the one being dragged stays visible over it. */}
      <RemoveTarget shown={dragging !== null} hot={overTarget} />
      {!picking &&
        threads
          .filter((thread) => !dropped.has(thread.id))
          .map((thread) => (
            <ThreadBubble
              key={thread.id}
              thread={thread}
              position={thread.anchor ? anchors.position(thread.id) : corner}
              visible={
                (!thread.anchor || anchors.visible.has(thread.id)) && state.openThreadId !== thread.id && !comparing
              }
              onOpen={() => stylus.openThread(thread.id)}
              onDragStart={() => setDragging(thread.id)}
              onDragMove={(point) => setOverTarget(isOverRemoveTarget(point, window, insets))}
              onDrop={(point) => drop(thread.id, point)}
            />
          ))}

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
          <ComposerDock frame={target?.frame ?? null} appShift={appShift} onDismiss={stylus.close}>
            {composer}
          </ComposerDock>
        </>
      )}

      {sheetThread && (
        <ThreadSheet
          stylus={stylus}
          thread={sheetThread}
          hidden={mode !== "thread" || comparing !== null}
          detent={detent}
          onDetentChange={setDetent}
          onHidden={() => mode !== "thread" && setSheetThreadId(null)}
          draft={draft}
          onDraftChange={setDraft}
          onCompare={setComparing}
        />
      )}

      {picking && <PickingBar hover={state.hover} message={state.error ?? state.notice} onCancel={stylus.cancelPick} />}
    </>
  );
}

function BeforeScreenFor({ stylus, turnId }: { stylus: Stylus; turnId: string }) {
  const screenshot = stylus.before(turnId);
  return screenshot ? <BeforeScreen screenshot={screenshot} visible /> : null;
}

type ThreadSheetProps = {
  stylus: Stylus;
  thread: Thread;
  hidden: boolean;
  detent: Detent;
  onDetentChange: (detent: Detent) => void;
  onHidden: () => void;
  draft: string;
  onDraftChange: (draft: string) => void;
  /** Called with a turn's id while its Compare is held, and with null on release. */
  onCompare: (turnId: string | null) => void;
};

/** One thread's conversation, which collapses back into its bubble when closed. */
function ThreadSheet({
  stylus,
  thread,
  hidden,
  detent,
  onDetentChange,
  onHidden,
  draft,
  onDraftChange,
  onCompare,
}: ThreadSheetProps) {
  const styles = useStyles();
  const { state } = stylus;
  const latest = thread.turns.at(-1);
  const active = latest?.status === "queued" || latest?.status === "running";

  return (
    <StylusSheet
      detent={detent}
      onDetentChange={onDetentChange}
      onDismiss={stylus.close}
      hidden={hidden}
      onHidden={onHidden}
    >
      <SheetHeader>
        <SheetTitle
          title={threadTitle(thread)}
          subtitle={`${threadPlace(thread)} · ${threadStatus(thread)}`}
          busy={active || latest?.status === "checking"}
        />
        <IconButton icon="x" label="Close the conversation" size="small" onPress={stylus.close} />
      </SheetHeader>

      <SheetBody followKey={thread.turns.length}>
        {thread.turns.map((turn) => (
          <Turn
            key={turn.id}
            turn={turn}
            repaired={thread.turns.some((later) => later.repairs === turn.id)}
            onUndo={state.threads.undoable === turn.id ? () => void stylus.undo(thread, turn) : null}
            onFix={turn === latest && turn.status === "broken" ? () => void stylus.fixCrash(thread) : null}
            onCompare={turn.edited && stylus.before(turn.id) ? (holding) => onCompare(holding ? turn.id : null) : null}
          >
            <TurnRequest />
            <TurnParts />
            <TurnFooter />
          </Turn>
        ))}
      </SheetBody>

      <SheetFooter>
        <Composer
          draft={draft}
          onDraftChange={onDraftChange}
          running={active}
          disabled={false}
          onSend={(text) => void stylus.reply(thread, text)}
          onStop={() => latest && stylus.stop(latest)}
        >
          {state.error && <Text style={styles.error}>{state.error}</Text>}
          <ComposerField>
            <ComposerInput placeholder="Ask for another change" />
            <ComposerSubmit />
          </ComposerField>
        </Composer>
      </SheetFooter>
    </StylusSheet>
  );
}

/** A thread reads like a comment thread, headed by its first request. */
function threadTitle(thread: Thread) {
  const first = thread.turns.find((turn) => turn.origin === "developer");
  return first?.request ?? "Fixing the crash";
}

function threadPlace(thread: Thread) {
  const picked = thread.anchor?.components[thread.anchor.selected];
  if (!picked) return "The whole app";
  const file = picked.location.file;
  return `${threadName(thread)} in ${file.slice(file.lastIndexOf("/") + 1)}`;
}

function threadStatus(thread: Thread) {
  const latest = thread.turns.at(-1);
  switch (latest?.status) {
    case "queued":
      return "Waiting for another change to finish";
    case "running":
      return "Working on it";
    case "checking":
      return "Checking on device";
    case "broken":
      return "The app is crashing";
    case "failed":
      return "The last request failed";
  }
  const changes = thread.turns.filter((turn) => turn.status === "done" && turn.edited).length;
  if (changes === 0) return "No changes yet";
  return changes === 1 ? "1 change" : `${changes} changes`;
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    error: { color: palette.danger, fontSize: 14, lineHeight: 20, paddingHorizontal: 8 },
  }),
);
