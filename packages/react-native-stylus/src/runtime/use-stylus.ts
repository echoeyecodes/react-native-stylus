import { useCallback, useEffect, useReducer, useRef, useState, type RefObject } from "react";
import { Keyboard, type HostInstance } from "react-native";
import type { Rect, SourceLocation, TurnComponent, TurnEvent, TurnRequest } from "../shared/protocol";
import { AppHealth, type AppProblem } from "./app-health";
import { captureScreen } from "./capture-screen";
import { devServerOrigin } from "./dev-server";
import { inspectAtPoint } from "./inspect-at-point";
import type { NdjsonRequest } from "./post-ndjson";
import { errorLocations, projectLocations } from "./source-locations";
import { createStylusClient, type StylusClient } from "./stylus-client";
import { applyTurnEvent, settleParts, verifyTurn, type Turn } from "./turns";

export type PickedComponent = {
  name: string;
  location: SourceLocation;
  measure: () => Promise<Rect>;
};

export type Target = {
  /** Innermost first, only components whose JSX lives in the project. */
  components: PickedComponent[];
  selected: number;
  frame: Rect;
};

export type Hover = { name: string; frame: Rect };

export type StylusState = {
  mode: "idle" | "picking" | "chat";
  hover: Hover | null;
  notice: string | null;
  target: Target | null;
  turns: Turn[];
  /** Text to put back in the composer after a stop or an undo. `version` lets the same text return twice. */
  restore: { text: string; version: number };
  error: string | null;
};

type Action =
  | { type: "opened"; mode: "picking" | "chat" }
  | { type: "hovered"; hover: Hover | null }
  | { type: "noticed"; notice: string }
  | { type: "picked"; target: Target }
  | { type: "pickCancelled" }
  | { type: "levelSelected"; target: Target }
  | { type: "turnStarted"; turn: Turn }
  | { type: "turnEvent"; key: string; event: TurnEvent; now: number }
  | { type: "turnVerified"; key: string; problem: { message: string; location: TurnComponent | null } | null }
  | { type: "turnStopped"; key: string; now: number }
  | { type: "turnUndone"; turnId: string }
  | { type: "failed"; message: string }
  | { type: "closed" };

const INITIAL: StylusState = {
  mode: "idle",
  hover: null,
  notice: null,
  target: null,
  turns: [],
  restore: { text: "", version: 0 },
  error: null,
};

function reducer(state: StylusState, action: Action): StylusState {
  switch (action.type) {
    case "opened":
      return { ...state, mode: action.mode, hover: null, notice: null, error: null };
    case "hovered":
      return { ...state, hover: action.hover, notice: null };
    case "noticed":
      return { ...state, hover: null, notice: action.notice };
    case "picked":
      return { ...state, mode: "chat", target: action.target, hover: null, notice: null };
    case "pickCancelled":
      return { ...state, mode: "chat", hover: null, notice: null };
    case "levelSelected":
      return { ...state, target: action.target };
    case "turnStarted":
      return { ...state, error: null, turns: [...state.turns, action.turn] };
    case "turnEvent":
      return updateTurn(state, action.key, (turn) => applyTurnEvent(turn, action.event, action.now));
    case "turnVerified":
      return updateTurn(state, action.key, (turn) => verifyTurn(turn, action.problem));
    case "turnStopped": {
      const next = updateTurn(state, action.key, (turn) => ({ ...settleParts(turn, action.now), status: "stopped" }));
      const stopped = next.turns.find((turn) => turn.key === action.key);
      return stopped?.origin === "developer" ? restore(next, stopped.request) : next;
    }
    case "turnUndone": {
      const index = state.turns.findIndex((turn) => turn.turnId === action.turnId);
      const undone = state.turns[index];
      if (!undone) return state;
      const turns = state.turns.map((turn, position) =>
        position >= index && (turn.status === "done" || turn.status === "broken")
          ? { ...turn, status: "undone" as const }
          : turn,
      );
      return undone.origin === "developer" ? restore({ ...state, turns }, undone.request) : { ...state, turns };
    }
    case "failed":
      return { ...state, error: action.message };
    case "closed":
      return INITIAL;
  }
}

function updateTurn(state: StylusState, key: string, update: (turn: Turn) => Turn): StylusState {
  return { ...state, turns: state.turns.map((turn) => (turn.key === key ? update(turn) : turn)) };
}

function restore(state: StylusState, text: string): StylusState {
  return { ...state, restore: { text, version: state.restore.version + 1 } };
}

export type Stylus = ReturnType<typeof useStylus>;

type Point = { x: number; y: number };

type TurnSeed = Pick<Turn, "origin" | "repairs" | "request" | "target">;

const NOTHING_HERE = "Nothing here comes from your code.";
/** Long enough for Fast Refresh to apply a turn's last edit. */
const REFRESH_MS = 500;
/** Long enough after that for the app to render and run its effects. */
const SETTLE_MS = 1000;

/**
 * Drives one Stylus session: picking elements, holding the conversation about them, and checking
 * that every change still runs. Points and frames are in the coordinates of `rootRef`, which holds
 * both the app and the overlay.
 */
export function useStylus(rootRef: RefObject<HostInstance | null>, appRef: RefObject<HostInstance | null>) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [health] = useState(() => new AppHealth());
  const client = useRef<StylusClient | null>(null);
  const session = useRef<Promise<string> | null>(null);
  const activeTurn = useRef<NdjsonRequest | null>(null);
  const rootOffset = useRef<Point>({ x: 0, y: 0 });
  /** Bumped by every hit test, so a slow one can't overwrite a newer result. */
  const inspection = useRef(0);
  const pendingHover = useRef<Point | null>(null);
  const hovering = useRef(false);

  const toLocal = (rect: Rect): Rect => ({
    ...rect,
    x: rect.x - rootOffset.current.x,
    y: rect.y - rootOffset.current.y,
  });
  const fail = useCallback((error: unknown) => {
    dispatch({ type: "failed", message: error instanceof Error ? error.message : String(error) });
  }, []);

  /** Connects to Metro and starts a session if there isn't one. Returns false when Stylus can't run. */
  const connect = useCallback(() => {
    const origin = devServerOrigin();
    if (!origin) {
      fail(new Error("Stylus works when the app loads its JavaScript from Metro."));
      return false;
    }
    const api = (client.current ??= createStylusClient(origin));
    if (session.current) return true;

    const created = api.createSession();
    session.current = created;
    created.catch((error: unknown) => {
      session.current = null;
      fail(error);
    });
    return true;
  }, [fail]);

  const start = useCallback(() => {
    Keyboard.dismiss();
    rootRef.current?.measureInWindow((x, y) => (rootOffset.current = { x, y }));
    dispatch({ type: "opened", mode: "picking" });
    connect();
  }, [connect, rootRef]);

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
          const frame = innermost ? toLocal(await innermost.measure()) : null;
          if (run !== inspection.current) continue;
          dispatch({ type: "hovered", hover: innermost && frame ? { name: innermost.name, frame } : null });
        }
        hovering.current = false;
      };
      void drain();
    },
    [appRef],
  );

  const pick = useCallback(
    async (point: Point) => {
      const view = appRef.current;
      const api = client.current;
      if (!view || !api) return;
      pendingHover.current = null;
      const run = ++inspection.current;

      try {
        const inspected = await inspectAtPoint(view, point.x - rootOffset.current.x, point.y - rootOffset.current.y);
        const locations = await projectLocations(
          api.origin,
          inspected.map((component) => component.debugStack),
        );
        const components = inspected.flatMap((component, index) => {
          const location = locations[index];
          return location ? [{ name: component.name, location, measure: component.measure }] : [];
        });
        const [first] = components;
        const frame = first ? toLocal(await first.measure()) : null;
        if (run !== inspection.current) return;

        if (!first || !frame) return dispatch({ type: "noticed", notice: NOTHING_HERE });
        dispatch({ type: "picked", target: { components, selected: 0, frame } });
      } catch (error) {
        fail(error);
      }
    },
    [appRef, fail],
  );

  const selectLevel = useCallback(async (target: Target, index: number) => {
    const component = target.components[index];
    if (!component) return;
    const frame = toLocal(await component.measure());
    dispatch({ type: "levelSelected", target: { ...target, selected: index, frame } });
  }, []);

  /**
   * Runs one turn: streams its transcript, then, if it edited anything, watches the app to see
   * whether the edits broke it. A developer's turn that breaks the app gets one repair.
   */
  async function runTurn(seed: TurnSeed, buildRequest: () => Promise<TurnRequest>) {
    const api = client.current;
    if (!api || !session.current) return;

    const key = `${Date.now()}`;
    dispatch({
      type: "turnStarted",
      turn: { ...seed, key, parts: [], status: "running", turnId: null, lastEditAt: null, error: null },
    });

    const crashedBefore = health.crash?.message ?? null;
    const startedAt = Date.now();
    let lastEditAt: number | null = null;
    let turn: NdjsonRequest | null = null;
    let settled = false;

    const onEvent = (event: TurnEvent) => {
      const now = Date.now();
      if (event.type === "tool-result" && event.diff) lastEditAt = now;
      if (event.type === "done" || event.type === "error") settled = true;
      dispatch({ type: "turnEvent", key, event, now });
      if (event.type === "done" && (lastEditAt !== null || seed.origin === "repair")) {
        const since = lastEditAt ?? startedAt;
        setTimeout(() => {
          health.retry();
          setTimeout(() => void verify(key, seed, since, crashedBefore), SETTLE_MS);
        }, REFRESH_MS);
      }
    };

    try {
      const [sessionId, request] = await Promise.all([session.current, buildRequest()]);
      turn = api.runTurn(sessionId, request, onEvent);
      activeTurn.current = turn;
      await turn.done;
      if (!settled && activeTurn.current === turn) {
        onEvent({ type: "error", message: "The change stopped before it finished." });
      }
    } catch (error) {
      onEvent({ type: "error", message: error instanceof Error ? error.message : String(error) });
    } finally {
      if (activeTurn.current === turn) activeTurn.current = null;
    }
  }

  async function repair(problem: AppProblem, repairs: string | null) {
    const api = client.current;
    if (!api) return;
    const components = await errorLocations(api.origin, problem.stack).catch(() => []);
    const [first] = components;
    await runTurn(
      {
        origin: "repair",
        repairs,
        request: problem.message,
        target: first
          ? { name: first.name, file: first.location.file, line: first.location.line }
          : { name: "App", file: "", line: 0 },
      },
      async () => ({
        text: "",
        components,
        selected: 0,
        frame: null,
        screenshot: null,
        repair: { message: problem.message, causedByLastChange: repairs !== null },
      }),
    );
  }

  async function verify(key: string, seed: TurnSeed, since: number, crashedBefore: string | null) {
    const api = client.current;
    if (!api || !session.current) return;
    const problem = health.problemSince(since);
    if (!problem) return dispatch({ type: "turnVerified", key, problem: null });

    const [location] = await errorLocations(api.origin, problem.stack).catch(() => []);
    dispatch({ type: "turnVerified", key, problem: { message: problem.message, location: location ?? null } });

    // A crash that was there before the turn isn't the turn's doing, so it isn't repaired unasked.
    const causedByTurn = !(problem === health.crash && problem.message === crashedBefore);
    if (seed.origin === "developer" && causedByTurn) await repair(problem, key);
  }

  async function send(target: Target | null, text: string) {
    const view = appRef.current;
    const picked = target?.components[target.selected];
    if (!view) return;
    await runTurn(
      {
        origin: "developer",
        repairs: null,
        request: text,
        target: picked
          ? { name: picked.name, file: picked.location.file, line: picked.location.line }
          : { name: "App", file: "", line: 0 },
      },
      async () => ({
        text,
        components: target?.components.map(({ name, location }) => ({ name, location })) ?? [],
        selected: target?.selected ?? 0,
        frame: target?.frame ?? null,
        screenshot: await captureScreen(view),
        repair: null,
      }),
    );
  }

  /** Asks Claude to fix the crash on screen, opening Stylus if it is closed. */
  function fixCrash() {
    const crash = health.crash;
    if (!crash) return;
    Keyboard.dismiss();
    dispatch({ type: "opened", mode: "chat" });
    if (connect()) void repair(crash, null);
  }

  /** The server puts back anything the turn had already edited. */
  const stop = useCallback((turn: Turn) => {
    const request = activeTurn.current;
    activeTurn.current = null;
    request?.abort();
    dispatch({ type: "turnStopped", key: turn.key, now: Date.now() });
  }, []);

  /** Restores the files to how they were before `turn`, which also undoes any later turn. */
  const undo = useCallback(
    async (turn: Turn) => {
      const api = client.current;
      if (!api || !session.current || !turn.turnId) return;
      try {
        await api.undo(await session.current, turn.turnId);
        dispatch({ type: "turnUndone", turnId: turn.turnId });
        // Putting the files back can fix a crash, so the crashed screen gets another try once it lands.
        setTimeout(() => health.retry(), REFRESH_MS);
      } catch (error) {
        fail(error);
      }
    },
    [fail, health],
  );

  const close = useCallback(() => {
    activeTurn.current?.abort();
    activeTurn.current = null;
    const api = client.current;
    const ending = session.current;
    session.current = null;
    // Metro closes idle sessions on its own, so a session that can't be ended here still goes away.
    if (api && ending) ending.then((id) => api.endSession(id)).catch(() => {});
    dispatch({ type: "closed" });
  }, []);

  /** Leaves picking without choosing anything, closing Stylus if there is nothing to go back to. */
  const cancelPick = useCallback(() => {
    if (state.target || state.turns.length > 0) dispatch({ type: "pickCancelled" });
    else close();
  }, [state.target, state.turns.length, close]);

  useEffect(() => close, [close]);

  return { state, health, start, hover, pick, cancelPick, selectLevel, send, fixCrash, stop, undo, close };
}
