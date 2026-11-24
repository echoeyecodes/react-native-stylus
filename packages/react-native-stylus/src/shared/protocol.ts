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
  /** Size of the captured area in points, the unit `frame` uses. */
  width: number;
  height: number;
};

/** The element a thread is about. */
export type Anchor = {
  /** The components around the element, innermost first. */
  components: TurnComponent[];
  /** Index into `components` of the one the developer picked. */
  selected: number;
  /** Where the element was on screen when it was picked. */
  frame: Rect;
};

export type TurnOrigin = "developer" | "repair";

/** A request the app adds to a thread. */
export type NewTurn = {
  text: string;
  /** A repair is a turn Stylus sends to fix a crash, rather than one the developer wrote. */
  origin: TurnOrigin;
  /** For a repair of a turn that broke the app, that turn's id. */
  repairs: string | null;
  screenshot: Screenshot | null;
  /** Set on repairs: the crash and the project code it went through, innermost first. */
  crash: { message: string; components: TurnComponent[] } | null;
};

export type CreateThreadRequest = {
  /** Null for a thread about the whole app, such as fixing a crash from the crash screen. */
  anchor: Anchor | null;
  turn: NewTurn;
};

export type CreateThreadResponse = { threadId: string; turnId: string };

export type AddTurnResponse = { turnId: string };

/** What the app found once a turn's edits reached it. `problem` is null when it ran fine. */
export type VerifyRequest = {
  problem: { message: string; location: TurnComponent | null } | null;
};

export type ErrorResponse = { message: string };

export type ToolName = "Read" | "Edit" | "Write" | "Glob" | "Grep";

/** A type and syntax check of the files a turn edited, run before Claude may finish. */
export type CheckStatus = "passed" | "failed";

export type DiffHunk = {
  oldStart: number;
  newStart: number;
  /** Each line starts with "+", "-" or " ". */
  lines: string[];
};

/**
 * The transcript of one turn as it streams. A turn is a sequence of parts: reasoning, text and
 * tool calls, each opened once and then filled in by later events with the same `id`.
 */
export type TurnEvent =
  | { type: "reasoning"; id: string }
  | { type: "text"; id: string }
  | { type: "tool"; id: string; name: ToolName }
  | { type: "delta"; id: string; text: string }
  | { type: "end"; id: string }
  | { type: "tool-input"; id: string; detail: string | null }
  | { type: "tool-result"; id: string; ok: boolean; diff: DiffHunk[] | null }
  | { type: "check"; id: string; status: CheckStatus; files: string[]; problems: string[] }
  /** `edited` says whether the turn changed any file, which decides whether the app checks it. */
  | { type: "done"; edited: boolean }
  | { type: "error"; message: string };

/** One step in a turn's life, in order. Replaying a turn's log rebuilds it. */
export type TurnLogEntry =
  | { type: "started"; at: number }
  | { type: "transcript"; event: TurnEvent; at: number }
  | { type: "verified"; problem: VerifyRequest["problem"] }
  /** No app reported back in time, so the edits weren't checked on a device. */
  | { type: "unverified" }
  | { type: "stopped"; at: number }
  | { type: "undone" };

export type TurnSnapshot = {
  id: string;
  text: string;
  origin: TurnOrigin;
  repairs: string | null;
  /** The component the request was about, as it was when the request was sent. */
  target: TurnComponent;
  log: TurnLogEntry[];
};

export type ThreadSnapshot = {
  id: string;
  anchor: Anchor | null;
  turns: TurnSnapshot[];
};

/**
 * Everything Metro streams to the app. A connection starts with a snapshot of every thread, so an
 * app that reloads picks up where it left off.
 */
export type StylusEvent =
  /** `undoable` is the only turn Undo can be offered on right now, across every thread. */
  | { type: "snapshot"; threads: ThreadSnapshot[]; undoable: string | null }
  | { type: "thread-added"; thread: ThreadSnapshot }
  | { type: "thread-removed"; threadId: string }
  | { type: "turn-added"; threadId: string; turn: TurnSnapshot }
  | { type: "turn-log"; turnId: string; entry: TurnLogEntry }
  | { type: "undoable"; turnId: string | null };
