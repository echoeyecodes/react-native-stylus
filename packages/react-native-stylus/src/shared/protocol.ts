export const ROUTE_PREFIX = "/__stylus";

export type SourceLocation = {
  /** Absolute path on the machine running Metro. */
  file: string;
  line: number;
};

export type Rect = { x: number; y: number; width: number; height: number };

export type TurnComponent = {
  name: string;
  location: SourceLocation;
};

export type Screenshot = {
  base64: string;
  /** In points, the unit `frame` uses. */
  width: number;
  height: number;
};

/** The element a thread is about. */
export type Anchor = {
  /** Innermost first. */
  components: TurnComponent[];
  /** Index of the picked component in `components`. */
  selected: number;
  /** On-screen bounds when picked. */
  frame: Rect;
};

export type TurnOrigin = "developer" | "repair";

export type NewTurn = {
  text: string;
  /** `repair` turns are sent by Stylus to fix a crash. */
  origin: TurnOrigin;
  /** Id of the turn this one repairs. */
  repairs: string | null;
  screenshot: Screenshot | null;
  /** Set on repairs; `components` is innermost first. */
  crash: { message: string; components: TurnComponent[] } | null;
};

export type CreateThreadRequest = {
  /** Null for a thread about the whole app. */
  anchor: Anchor | null;
  turn: NewTurn;
};

export type CreateThreadResponse = { threadId: string; turnId: string };

export type AddTurnResponse = { turnId: string };

/** `problem` is null when the edited app ran fine. */
export type VerifyRequest = {
  problem: { message: string; location: TurnComponent | null } | null;
};

export type ErrorResponse = { message: string };

/** `Run` is a shell command. */
export type ToolName = "Read" | "Edit" | "Write" | "Glob" | "Grep" | "Run";

/** Result of the type check on a turn's edited files. */
export type CheckStatus = "passed" | "failed";

export type DiffHunk = {
  oldStart: number;
  newStart: number;
  /** Each line starts with "+", "-" or " ". */
  lines: string[];
};

/** Each part is opened once, then filled in by later events with the same `id`. */
export type TurnEvent =
  | { type: "reasoning"; id: string }
  | { type: "text"; id: string }
  | { type: "tool"; id: string; name: ToolName }
  | { type: "delta"; id: string; text: string }
  | { type: "end"; id: string }
  | { type: "tool-input"; id: string; detail: string | null }
  | { type: "tool-result"; id: string; ok: boolean; diff: DiffHunk[] | null }
  | { type: "check"; id: string; status: CheckStatus; files: string[]; problems: string[] }
  /** `edited` is true when the turn changed any file. */
  | { type: "done"; edited: boolean }
  | { type: "error"; message: string };

/** Replaying a turn's log in order rebuilds the turn. */
export type TurnLogEntry =
  | { type: "started"; at: number }
  | { type: "transcript"; event: TurnEvent; at: number }
  | { type: "verified"; problem: VerifyRequest["problem"] }
  /** No app reported back before the timeout. */
  | { type: "unverified" }
  | { type: "stopped"; at: number }
  | { type: "undone" };

export type TurnSnapshot = {
  id: string;
  text: string;
  origin: TurnOrigin;
  repairs: string | null;
  /** As of when the request was sent. */
  target: TurnComponent;
  log: TurnLogEntry[];
};

export type ThreadSnapshot = {
  id: string;
  anchor: Anchor | null;
  turns: TurnSnapshot[];
};

/** Each connection starts with a snapshot of every thread. */
export type StylusEvent =
  /** `undoable` is the one turn, across all threads, Undo can apply to. */
  | { type: "snapshot"; threads: ThreadSnapshot[]; undoable: string | null }
  | { type: "thread-added"; thread: ThreadSnapshot }
  | { type: "thread-removed"; threadId: string }
  | { type: "turn-added"; threadId: string; turn: TurnSnapshot }
  | { type: "turn-log"; turnId: string; entry: TurnLogEntry }
  | { type: "undoable"; turnId: string | null };
