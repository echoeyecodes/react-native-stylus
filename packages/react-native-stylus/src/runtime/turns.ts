import type {
  CheckStatus,
  DiffHunk,
  ToolName,
  TurnComponent,
  TurnEvent,
  TurnLogEntry,
  TurnOrigin,
  TurnSnapshot,
  VerifyRequest,
} from "../shared/protocol";

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

export type TurnStatus = "queued" | "running" | "checking" | "done" | "broken" | "stopped" | "failed" | "undone";

export type Turn = {
  id: string;
  origin: TurnOrigin;
  /** For a repair of a turn that broke the app, that turn's id. */
  repairs: string | null;
  request: string;
  /** The component the request was about, as it was when the request was sent. */
  target: TurnComponent;
  parts: Part[];
  status: TurnStatus;
  /** Whether the turn changed any file, known once it finishes. */
  edited: boolean;
  error: string | null;
};

/** Rebuilds a turn from Metro's record of it. */
export function turnFromSnapshot(snapshot: TurnSnapshot): Turn {
  const queued: Turn = {
    id: snapshot.id,
    origin: snapshot.origin,
    repairs: snapshot.repairs,
    request: snapshot.text,
    target: snapshot.target,
    parts: [],
    status: "queued",
    edited: false,
    error: null,
  };
  return snapshot.log.reduce(applyLogEntry, queued);
}

export function applyLogEntry(turn: Turn, entry: TurnLogEntry): Turn {
  switch (entry.type) {
    case "started":
      return { ...turn, status: "running" };
    case "transcript":
      return applyTurnEvent(turn, entry.event, entry.at);
    case "verified":
      return verifyTurn(turn, entry.problem);
    case "unverified":
      return {
        ...turn,
        status: "done",
        parts: turn.parts.filter((part) => part.kind !== "device"),
      };
    case "stopped":
      return { ...settleParts(turn, entry.at), status: "stopped" };
    case "undone":
      return { ...turn, status: "undone" };
  }
}

function applyTurnEvent(turn: Turn, event: TurnEvent, at: number): Turn {
  switch (event.type) {
    case "reasoning":
      return withPart(turn, { kind: "reasoning", id: event.id, text: "", startedAt: at, endedAt: null });
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
      return updatePart(turn, event.id, (part) => (part.kind === "reasoning" ? { ...part, endedAt: at } : part));
    case "tool-input":
      return updatePart(turn, event.id, (part) => (part.kind === "tool" ? { ...part, detail: event.detail } : part));
    case "tool-result":
      return updatePart(turn, event.id, (part) =>
        part.kind === "tool" ? { ...part, status: event.ok ? "done" : "failed", diff: event.diff } : part,
      );
    case "check":
      return withPart(turn, {
        kind: "check",
        id: event.id,
        status: event.status,
        files: event.files,
        problems: event.problems,
      });
    case "done": {
      const settled = { ...settleParts(turn, at), edited: event.edited };
      // A repair is checked even when it changed nothing, since its point is that the crash is gone.
      if (!needsDeviceCheck(settled)) return { ...settled, status: "done" };
      const device: DevicePart = {
        kind: "device",
        id: `${turn.id}:device`,
        status: "running",
        message: null,
        location: null,
      };
      return withPart({ ...settled, status: "checking" }, device);
    }
    case "error":
      return { ...settleParts(turn, at), status: "failed", error: event.message };
  }
}

/** Whether the app should check that it still runs after this turn, once the turn is done. */
export function needsDeviceCheck(turn: Turn) {
  return turn.edited || turn.origin === "repair";
}

function verifyTurn(turn: Turn, problem: VerifyRequest["problem"]): Turn {
  const verified = updatePart(turn, `${turn.id}:device`, (part) => {
    if (part.kind !== "device") return part;
    return problem
      ? { ...part, status: "failed", message: problem.message, location: problem.location }
      : { ...part, status: "passed" };
  });
  return { ...verified, status: problem ? "broken" : "done" };
}

/** Closes parts left open when a turn ends early. */
function settleParts(turn: Turn, at: number): Turn {
  return {
    ...turn,
    parts: turn.parts.map((part) => {
      if (part.kind === "reasoning" && part.endedAt === null) return { ...part, endedAt: at };
      if (part.kind === "tool" && part.status === "running") return { ...part, status: "failed" };
      return part;
    }),
  };
}

/** Undoing a repair also undoes the change it was repairing, since that change is what broke the app. */
export function undoTarget(turns: Turn[], turn: Turn): Turn {
  return turns.find((candidate) => candidate.id === turn.repairs) ?? turn;
}

function withPart(turn: Turn, part: Part): Turn {
  return { ...turn, parts: [...turn.parts, part] };
}

function updatePart(turn: Turn, id: string, update: (part: Part) => Part): Turn {
  return { ...turn, parts: turn.parts.map((part) => (part.id === id ? update(part) : part)) };
}
