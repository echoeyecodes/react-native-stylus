import type { TurnEvent } from "../shared/protocol.js";
import type { EditTracker } from "./edit-tracker.js";

export type PromptContent = (
  | { type: "text"; text: string }
  | { type: "image"; mimeType: "image/jpeg"; base64: string }
)[];

export type Prompt = {
  content: PromptContent;
  /** Files inlined in `content`, so the agent can edit them without a read. */
  seen: { file: string; mtimeMs: number }[];
};

/** Outcome events are Stylus's to emit. */
export type TranscriptEvent = Exclude<TurnEvent, { type: "check" | "done" | "error" }>;

export type PromptTurn = {
  emit: (event: TranscriptEvent) => void;
  /** Agents must report every edited file here. */
  edits: EditTracker;
};

/** A broken agent throws instead of returning `error`. */
export type PromptOutcome = { type: "done" } | { type: "stopped" } | { type: "error"; message: string };

/** Holds one conversation shared by every thread. */
export interface Agent {
  /** Aborting `signal` should end the prompt as stopped. */
  prompt(prompt: Prompt, turn: PromptTurn, signal: AbortSignal): Promise<PromptOutcome>;
  /** Also ends the agent's process. */
  close(): void;
}

export type AgentOptions = {
  projectRoot: string;
  /** Editable folders outside the project, such as monorepo packages. */
  additionalDirectories: string[];
  /** In the agent's own naming; null keeps the agent's default. */
  model: string | null;
};
