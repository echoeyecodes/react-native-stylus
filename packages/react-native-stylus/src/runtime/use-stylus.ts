import { useCallback, useEffect, useReducer, useRef, useState, type RefObject } from "react";
import { Keyboard, type HostInstance } from "react-native";
import type { NewTurn, Rect, Screenshot, SourceLocation, StylusEvent, TurnComponent } from "../shared/protocol";
import { AppHealth } from "./app-health";
import { captureScreen } from "./capture-screen";
import { devServerOrigin } from "./dev-server";
import { pauseFastRefresh, resumeFastRefresh } from "./fast-refresh";
import { inspectAtPoint, type InspectedComponent } from "./inspect-at-point";
import { errorLocations, projectLocations } from "./source-locations";
import { createStylusClient, SetupError, type StylusClient } from "./stylus-client";
import { applyStylusEvent, findTurn, isEditing, NO_THREADS, type Thread, type Threads } from "./threads";
import { needsDeviceCheck, undoTarget, type Turn } from "./turns";
import { useAnchorPositions } from "./use-anchor-positions";

export type PickedComponent = InspectedComponent & { location: SourceLocation };

export type Target = {
  /** Innermost first, only components whose JSX lives in the project. */
  components: PickedComponent[];
  selected: number;
  frame: Rect;
};

export type Hover = { name: string; frame: Rect };

/**
 * `idle` shows only the bubbles. `composer` asks about a newly picked element, and `thread`
 * shows one thread's conversation.
 */
export type Mode = "idle" | "picking" | "composer" | "thread";

export type StylusState = {
  mode: Mode;
  /** The thread whose conversation is open. */
  openThreadId: string | null;
  hover: Hover | null;
  notice: string | null;
  /** The element picked for a new thread. */
  target: Target | null;
  threads: Threads;
  /** Text to put back in the composer after a stop. `version` lets the same text return twice. */
  restore: { text: string; version: number };
  error: string | null;
};

type Action =
  | { type: "pickStarted" }
  | { type: "hovered"; hover: Hover | null }
  | { type: "noticed"; notice: string }
  | { type: "picked"; target: Target }
  | { type: "pickCancelled" }
  | { type: "levelSelected"; target: Target }
  | { type: "threadOpened"; threadId: string }
  | { type: "closed" }
  | { type: "received"; event: StylusEvent }
  | { type: "restored"; text: string }
  | { type: "failed"; message: string };

const INITIAL: StylusState = {
  mode: "idle",
  openThreadId: null,
  hover: null,
  notice: null,
  target: null,
  threads: NO_THREADS,
  restore: { text: "", version: 0 },
  error: null,
};

function reducer(state: StylusState, action: Action): StylusState {
  switch (action.type) {
    case "pickStarted":
      return { ...state, mode: "picking", openThreadId: null, hover: null, notice: null, error: null };
    case "hovered":
      return { ...state, hover: action.hover, notice: null };
    case "noticed":
      return { ...state, hover: null, notice: action.notice };
    case "picked":
      return { ...state, mode: "composer", target: action.target, hover: null, notice: null };
    case "pickCancelled":
      return { ...state, mode: state.target ? "composer" : "idle", hover: null, notice: null };
    case "levelSelected":
      return { ...state, target: action.target };
    case "threadOpened":
      return { ...state, mode: "thread", openThreadId: action.threadId, error: null };
    case "closed":
      return { ...state, mode: "idle", openThreadId: null, target: null, hover: null, notice: null };
    case "received": {
      const threads = applyStylusEvent(state.threads, action.event);
      const open = threads.list.some((thread) => thread.id === state.openThreadId);
      return open || state.mode !== "thread"
        ? { ...state, threads }
        : { ...state, threads, mode: "idle", openThreadId: null };
    }
    case "restored":
      return { ...state, restore: { text: action.text, version: state.restore.version + 1 } };
    case "failed":
      return { ...state, error: action.message };
  }
}

export type Stylus = ReturnType<typeof useStylus>;

type Point = { x: number; y: number };

const NOTHING_HERE = "Nothing here comes from your code.";

// Outlive Stylus being unmounted, as an app does while it loads a font.
const health = new AppHealth();
/** What the app looked like when each request was sent, for Compare. Lost on reload. */
const befores = new Map<string, Screenshot>();
/** Long enough for Fast Refresh to apply a turn's edits once they are released. */
const REFRESH_MS = 500;
/** Long enough after that for the app to render and run its effects. */
const SETTLE_MS = 1000;

/**
 * Drives Stylus in the app: picking elements, the threads about them, and checking that every
 * change still runs. Threads live in Metro, which streams them here, so they survive reloads.
 * Points and frames are in the coordinates of `rootRef`, which holds both the app and the overlay.
 */
export function useStylus(rootRef: RefObject<HostInstance | null>, appRef: RefObject<HostInstance | null>) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [origin] = useState(devServerOrigin);
  const [client] = useState<StylusClient | null>(() => (origin ? createStylusClient(origin) : null));
  /** The app's own view of every thread, kept in step with each event as it arrives. */
  const threads = useRef(NO_THREADS);
  const rootOffset = useRef<Point>({ x: 0, y: 0 });
  /** Bumped by every hit test, so a slow one can't overwrite a newer result. */
  const inspection = useRef(0);
  const pendingHover = useRef<Point | null>(null);
  const hovering = useRef(false);

  const toLocal = useCallback(
    (rect: Rect): Rect => ({ ...rect, x: rect.x - rootOffset.current.x, y: rect.y - rootOffset.current.y }),
    [],
  );
  const anchors = useAnchorPositions({ threads: state.threads.list, view: appRef, origin, toLocal });

  const fail = useCallback((error: unknown) => {
    dispatch({ type: "failed", message: error instanceof Error ? error.message : String(error) });
  }, []);

  const measureRoot = useCallback(() => {
    rootRef.current?.measureInWindow((x, y) => (rootOffset.current = { x, y }));
  }, [rootRef]);

  /**
   * Checks the app once a turn's edits have reached it. A developer's turn that broke the app gets
   * one repair, unless the app was already crashing before it.
   */
  const verify = useCallback(
    (thread: Thread, turn: Turn) => {
      if (!client) return;
      const since = Date.now();
      const crashedBefore = health.crash?.message ?? null;

      setTimeout(() => {
        health.retry();
        setTimeout(async () => {
          const problem = health.problemSince(since);
          if (!problem) return client.verify(turn.id, { problem: null }).catch(fail);

          const components = await errorLocations(client.origin, problem.stack).catch(() => []);
          await client
            .verify(turn.id, { problem: { message: problem.message, location: components[0] ?? null } })
            .catch(fail);
          const causedByTurn = !(problem === health.crash && problem.message === crashedBefore);
          if (turn.origin !== "developer" || !causedByTurn) return;
          await client.addTurn(thread.id, repairTurn(problem.message, components, turn.id)).catch(fail);
        }, SETTLE_MS);
      }, REFRESH_MS);
    },
    [client, fail],
  );

  useEffect(() => {
    if (!client) return;
    return client.subscribe(
      (event) => {
        const live = event.type !== "snapshot";
        threads.current = applyStylusEvent(threads.current, event);
        dispatch({ type: "received", event });
        if (!live || event.type !== "turn-log") return;
        if (event.entry.type !== "transcript" || event.entry.event.type !== "done") return;
        const found = findTurn(threads.current, event.turnId);
        if (found && needsDeviceCheck(found.turn)) verify(found.thread, found.turn);
      },
      (error: SetupError) => fail(error),
    );
  }, [client, verify, fail]);

  // Claude's edits are held while it works so the app never runs a half-made change.
  const editing = isEditing(state.threads);
  useEffect(() => (editing ? pauseFastRefresh() : resumeFastRefresh()), [editing]);

  const start = useCallback(() => {
    if (!client) return fail(new Error("Stylus works when the app loads its JavaScript from Metro."));
    Keyboard.dismiss();
    measureRoot();
    dispatch({ type: "pickStarted" });
    client.warm().catch(fail);
  }, [client, fail, measureRoot]);

  const hover = useCallback(
    (point: Point) => {
      pendingHover.current = point;
      if (hovering.current) return;
      hovering.current = true;

      const drain = async () => {
        const view = appRef.current;
        while (pendingHover.current && view) {
          const { x, y } = pendingHover.current;
          pendingHover.current = null;
          const run = ++inspection.current;
          const [innermost] = await inspectAtPoint(view, x - rootOffset.current.x, y - rootOffset.current.y);
          const rect = innermost ? await innermost.measure() : null;
          if (run !== inspection.current) continue;
          dispatch({
            type: "hovered",
            hover: innermost && rect ? { name: innermost.name, frame: toLocal(rect) } : null,
          });
        }
        hovering.current = false;
      };
      void drain();
    },
    [appRef, toLocal],
  );

  const pick = useCallback(
    async (point: Point) => {
      const view = appRef.current;
      if (!view || !client) return;
      pendingHover.current = null;
      const run = ++inspection.current;

      try {
        const inspected = await inspectAtPoint(view, point.x - rootOffset.current.x, point.y - rootOffset.current.y);
        const locations = await projectLocations(
          client.origin,
          inspected.map((component) => component.debugStack),
        );
        const components = inspected.flatMap((component, index) => {
          const location = locations[index];
          return location ? [{ ...component, location }] : [];
        });
        const [first] = components;
        const rect = first ? await first.measure() : null;
        if (run !== inspection.current) return;

        if (!first || !rect) return dispatch({ type: "noticed", notice: NOTHING_HERE });
        dispatch({ type: "picked", target: { components, selected: 0, frame: toLocal(rect) } });
      } catch (error) {
        fail(error);
      }
    },
    [appRef, client, fail, toLocal],
  );

  const selectLevel = useCallback(
    async (target: Target, index: number) => {
      const component = target.components[index];
      const rect = component ? await component.measure() : null;
      if (!rect) return;
      dispatch({ type: "levelSelected", target: { ...target, selected: index, frame: toLocal(rect) } });
    },
    [toLocal],
  );

  /** Leaves picking without choosing anything. */
  const cancelPick = useCallback(() => dispatch({ type: "pickCancelled" }), []);

  /**
   * Starts a thread about the picked element, which then shows as a bubble pinned to it. An element
   * that already has a bubble gets the request added to that thread instead.
   */
  const ask = useCallback(
    async (target: Target, text: string) => {
      const view = appRef.current;
      const picked = target.components[target.selected];
      if (!client || !view || !picked) return;
      Keyboard.dismiss();
      dispatch({ type: "closed" });
      try {
        const screenshot = await captureScreen(view);
        const existing = threads.current.list.find((thread) =>
          isSameElement(thread, picked.location, target.frame, anchors.frameOf(thread.id)),
        );
        if (existing) {
          const { turnId } = await client.addTurn(existing.id, developerTurn(text, screenshot));
          befores.set(turnId, screenshot);
          return;
        }
        const { threadId, turnId } = await client.createThread({
          anchor: {
            components: target.components.map(({ name, location }) => ({ name, location })),
            selected: target.selected,
            frame: target.frame,
          },
          turn: developerTurn(text, screenshot),
        });
        befores.set(turnId, screenshot);
        anchors.track(threadId, picked);
      } catch (error) {
        fail(error);
      }
    },
    [anchors, appRef, client, fail],
  );

  /** Adds a follow-up request to a thread. */
  const reply = useCallback(
    async (thread: Thread, text: string) => {
      const view = appRef.current;
      if (!client || !view) return;
      try {
        const screenshot = await captureScreen(view);
        const { turnId } = await client.addTurn(thread.id, developerTurn(text, screenshot));
        befores.set(turnId, screenshot);
      } catch (error) {
        fail(error);
      }
    },
    [appRef, client, fail],
  );

  /** Asks Claude to fix the crash on screen, in `thread` or else in a new thread about the whole app. */
  const fixCrash = useCallback(
    async (thread?: Thread) => {
      const crash = health.crash;
      if (!client || !crash) return;
      Keyboard.dismiss();
      try {
        const components = await errorLocations(client.origin, crash.stack).catch(() => []);
        const turn = repairTurn(crash.message, components, null);
        if (thread) await client.addTurn(thread.id, turn);
        else await client.createThread({ anchor: null, turn });
      } catch (error) {
        fail(error);
      }
    },
    [client, fail],
  );

  /** Metro puts back anything the turn had already edited. A stopped request returns to the composer. */
  const stop = useCallback(
    (turn: Turn) => {
      client?.stop(turn.id).catch(fail);
      if (turn.origin === "developer") dispatch({ type: "restored", text: turn.request });
    },
    [client, fail],
  );

  /** Restores the files to how they were before `turn`, which also undoes every later turn. */
  const undo = useCallback(
    async (thread: Thread, turn: Turn) => {
      if (!client) return;
      try {
        await client.undo(undoTarget(thread.turns, turn).id);
        // Putting the files back can fix a crash, so the crashed screen gets another try once it lands.
        setTimeout(() => health.retry(), REFRESH_MS);
      } catch (error) {
        fail(error);
      }
    },
    [client, fail],
  );

  /** Removes a thread's bubble. The changes it made stay. */
  const removeThread = useCallback(
    (threadId: string) => {
      client?.removeThread(threadId).catch(fail);
    },
    [client, fail],
  );

  const openThread = useCallback((threadId: string) => {
    Keyboard.dismiss();
    dispatch({ type: "threadOpened", threadId });
  }, []);

  /** Back to just the bubbles, from the composer or a conversation. */
  const close = useCallback(() => {
    Keyboard.dismiss();
    dispatch({ type: "closed" });
  }, []);

  const before = useCallback((turnId: string) => befores.get(turnId) ?? null, []);

  useEffect(() => measureRoot(), [measureRoot]);

  return {
    state,
    health,
    anchors,
    before,
    start,
    hover,
    pick,
    cancelPick,
    selectLevel,
    ask,
    reply,
    fixCrash,
    stop,
    undo,
    removeThread,
    openThread,
    close,
  };
}

/** The same JSX in the same place on screen; rows of a list share their JSX but not their place. */
function isSameElement(thread: Thread, location: SourceLocation, frame: Rect, seen: Rect | null) {
  const picked = thread.anchor?.components[thread.anchor.selected];
  if (!picked || !seen) return false;
  const near = (a: number, b: number) => Math.abs(a - b) <= 2;
  return (
    picked.location.file === location.file &&
    picked.location.line === location.line &&
    near(seen.x, frame.x) &&
    near(seen.y, frame.y) &&
    near(seen.width, frame.width) &&
    near(seen.height, frame.height)
  );
}

function developerTurn(text: string, screenshot: Screenshot): NewTurn {
  return { text, origin: "developer", repairs: null, screenshot, crash: null };
}

function repairTurn(message: string, components: TurnComponent[], repairs: string | null): NewTurn {
  return { text: "", origin: "repair", repairs, screenshot: null, crash: { message, components } };
}
