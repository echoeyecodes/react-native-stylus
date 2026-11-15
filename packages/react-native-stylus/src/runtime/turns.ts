import type { CheckStatus, DiffHunk, ToolName, TurnComponent, TurnEvent } from "../shared/protocol";

export type ReasoningPart = {
  kind: "reasoning";
  id: string;
  text: string;
  startedAt: number;
  endedAt: number | null;
};

export type TextPart = { kind: "text"; id: string; text: string };

export type ToolPart = {
  kind: "tool";
  id: string;
  name: ToolName;
  /** The file name, or the pattern for searches. Arrives after the call starts. */
  detail: string | null;
  status: "running" | "done" | "failed";
  diff: DiffHunk[] | null;
};

/** Metro's type check of the edited files, before Claude was allowed to finish. */
export type CheckPart = {
  kind: "check";
  id: string;
  status: CheckStatus;
  files: string[];
  problems: string[];
};

/** Whether the app still ran after the turn's edits reached the phone. */
export type DevicePart = {
  kind: "device";
  id: string;
  status: "running" | "passed" | "failed";
  message: string | null;
  /** The innermost project code the error went through. */
  location: TurnComponent | null;
};

export type Part = ReasoningPart | TextPart | ToolPart | CheckPart | DevicePart;

export type TurnStatus = "running" | "checking" | "done" | "broken" | "stopped" | "failed" | "undone";

export type Turn = {
  key: string;
  /** A repair is a turn Stylus sent to fix a crash, rather than one the developer wrote. */
  origin: "developer" | "repair";
  /** For a repair of a broken turn, that turn's key. */
  repairs: string | null;
  request: string;
  /** The picked component, as it was when the request was sent. */
  target: { name: string; file: string; line: number };
  parts: Part[];
  status: TurnStatus;
  /** Set once the turn finishes, and used to undo it. */
  turnId: string | null;
  /** When the turn's latest edit was written, so later errors can be traced to it. */
  lastEditAt: number | null;
  error: string | null;
};

export function applyTurnEvent(turn: Turn, event: TurnEvent, now: number): Turn {
  switch (event.type) {
    case "reasoning":
      return withPart(turn, { kind: "reasoning", id: event.id, text: "", startedAt: now, endedAt: null });
    case "text":
      return withPart(turn, { kind: "text", id: event.id, text: "" });
    case "tool":
      return withPart(turn, {
        kind: "tool",
        id: event.id,
        name: event.name,
        detail: null,
        status: "running",
        diff: null,
      });
    case "delta":
      return updatePart(turn, event.id, (part) =>
        part.kind === "reasoning" || part.kind === "text" ? { ...part, text: part.text + event.text } : part,
      );
    case "end":
      return updatePart(turn, event.id, (part) => (part.kind === "reasoning" ? { ...part, endedAt: now } : part));
    case "tool-input":
      return updatePart(turn, event.id, (part) => (part.kind === "tool" ? { ...part, detail: event.detail } : part));
    case "tool-result": {
      const next = updatePart(turn, event.id, (part) =>
        part.kind === "tool" ? { ...part, status: event.ok ? "done" : "failed", diff: event.diff } : part,
      );
      return event.diff ? { ...next, lastEditAt: now } : next;
    }
    case "check":
      return withPart(turn, {
        kind: "check",
        id: event.id,
        status: event.status,
        files: event.files,
        problems: event.problems,
      });
    case "done": {
      const settled = { ...settleParts(turn, now), turnId: event.turnId };
      // A repair is checked even when it changed nothing, since its point is that the crash is gone.
      if (turn.lastEditAt === null && turn.origin === "developer") return { ...settled, status: "done" };
      const device: DevicePart = {
        kind: "device",
        id: `${turn.key}:device`,
        status: "running",
        message: null,
        location: null,
      };
      return withPart({ ...settled, status: "checking" }, device);
    }
    case "error":
      return { ...settleParts(turn, now), status: "failed", error: event.message };
  }
}

/** Records how the app fared after the turn's edits: `problem` is null when it ran fine. */
export function verifyTurn(turn: Turn, problem: { message: string; location: TurnComponent | null } | null): Turn {
  const verified = updatePart(turn, `${turn.key}:device`, (part) => {
    if (part.kind !== "device") return part;
    return problem
      ? { ...part, status: "failed", message: problem.message, location: problem.location }
      : { ...part, status: "passed" };
  });
  return { ...verified, status: problem ? "broken" : "done" };
}

/** Closes parts left open when a turn ends early. */
export function settleParts(turn: Turn, now: number): Turn {
  return {
    ...turn,
    parts: turn.parts.map((part) => {
      if (part.kind === "reasoning" && part.endedAt === null) return { ...part, endedAt: now };
      if (part.kind === "tool" && part.status === "running") return { ...part, status: "failed" };
      return part;
    }),
  };
}

/** Undoing a repair also undoes the change it was repairing, since that change is what broke the app. */
export function undoTarget(turns: Turn[], turn: Turn): Turn {
  return turns.find((candidate) => candidate.key === turn.repairs) ?? turn;
}

function withPart(turn: Turn, part: Part): Turn {
  return { ...turn, parts: [...turn.parts, part] };
}

function updatePart(turn: Turn, id: string, update: (part: Part) => Part): Turn {
  return { ...turn, parts: turn.parts.map((part) => (part.id === id ? update(part) : part)) };
}
