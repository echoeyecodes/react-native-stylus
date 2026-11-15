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

export type TurnRequest = {
  text: string;
  /** Innermost component first. */
  components: TurnComponent[];
  /** Index into `components` of the one the developer picked. */
  selected: number;
  /** Where the picked element is on screen. Repairs have no picked element. */
  frame: Rect | null;
  screenshot: Screenshot | null;
  /** Set when the turn asks Claude to fix a crash; `components` then lists where it happened. */
  repair: { message: string; causedByLastChange: boolean } | null;
};

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
  | { type: "done"; turnId: string }
  | { type: "error"; message: string };

export type CreateSessionResponse = { sessionId: string };

export type UndoRequest = { turnId: string };

export type ErrorResponse = { message: string };
