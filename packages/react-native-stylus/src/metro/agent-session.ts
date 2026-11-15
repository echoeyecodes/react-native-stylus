import { randomUUID, type UUID } from "node:crypto";
import path from "node:path";
import type {
  HookInput,
  Options,
  Query,
  SDKMessage,
  SDKUserMessage,
  SyncHookJSONOutput,
  WarmQuery,
} from "@anthropic-ai/claude-agent-sdk";
import type { TurnEvent } from "../shared/protocol.js";
import type { CodeChecker, Problem } from "./code-checker.js";
import { STYLUS_INSTRUCTIONS } from "./instructions.js";
import { MessageQueue } from "./message-queue.js";
import { TurnCheck } from "./turn-check.js";
import type { TurnContent } from "./turn-content.js";
import { TurnTranscript } from "./turn-transcript.js";

const TOOLS = ["Read", "Edit", "Write", "Glob", "Grep"];
/** Claude gets this many chances to fix errors its edits introduced before it may finish anyway. */
const MAX_FIX_ROUNDS = 2;

export type AgentSessionOptions = {
  projectRoot: string;
  /** Folders outside the project the agent may edit, such as other packages in a monorepo. */
  additionalDirectories: string[];
  model: string;
};

type Turn = {
  id: UUID;
  transcript: TurnTranscript;
  check: TurnCheck;
  checks: number;
  stopped: boolean;
  emit: (event: TurnEvent) => void;
  finish: () => void;
};

/**
 * One Claude Code conversation, kept open from the moment the developer starts picking until
 * they are done, so follow-ups keep their context and every turn can be undone.
 */
export class AgentSession {
  readonly id = randomUUID();
  readonly #warm: Promise<WarmQuery>;
  readonly #inbox = new MessageQueue<SDKUserMessage>();
  readonly #options: AgentSessionOptions;
  readonly #checker: CodeChecker;
  #query: Query | null = null;
  #turn: Turn | null = null;

  constructor(options: AgentSessionOptions, checker: CodeChecker) {
    this.#options = options;
    this.#checker = checker;
    const hooks: Options["hooks"] = {
      PreToolUse: [{ matcher: "Edit|Write", hooks: [async (input) => this.#beforeEdit(input)] }],
      Stop: [{ hooks: [async () => this.#beforeFinishing()] }],
    };
    // Starting the CLI takes a few seconds, so it starts while the developer is still picking.
    this.#warm = import("@anthropic-ai/claude-agent-sdk").then(({ startup }) =>
      startup({ options: { ...queryOptions(options), hooks } }),
    );
    // A failed start-up is reported by the first turn, which awaits this promise.
    this.#warm.catch(() => {});
  }

  get isRunning() {
    return this.#turn !== null;
  }

  /**
   * Sends one request and emits its progress. Resolves once the turn has finished. `seen` lists
   * files whose current contents are in `content`, so the agent can edit them without reading
   * them first.
   */
  run(
    content: TurnContent,
    seen: { file: string; mtimeMs: number }[],
    emit: (event: TurnEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    return new Promise((resolve) => {
      const turn: Turn = {
        id: randomUUID(),
        transcript: new TurnTranscript(),
        check: new TurnCheck(this.#checker),
        checks: 0,
        stopped: false,
        emit,
        finish: () => {
          this.#turn = null;
          resolve();
        },
      };
      this.#turn = turn;

      signal.addEventListener(
        "abort",
        () => {
          turn.stopped = true;
          void this.#query?.interrupt();
        },
        { once: true },
      );

      this.#open()
        .then((query) => Promise.all(seen.map(({ file, mtimeMs }) => query.seedReadState(file, mtimeMs))))
        .then(
          () => this.#inbox.push(userMessage(turn.id, content)),
          (error: unknown) => this.#fail(turn, error),
        );
    });
  }

  async undo(turnId: string) {
    if (!this.#query) throw new Error("Nothing to undo yet.");
    const result = await this.#query.rewindFiles(turnId);
    if (!result.canRewind) throw new Error(result.error ?? "This change can't be undone.");
  }

  close() {
    this.#inbox.end();
    if (this.#query) this.#query.close();
    else
      void this.#warm.then(
        (warm) => warm.close(),
        () => {},
      );
  }

  async #open(): Promise<Query> {
    if (this.#query) return this.#query;
    const warm = await this.#warm;
    if (this.#query) return this.#query;
    const query = warm.query(this.#inbox);
    this.#query = query;
    void this.#consume(query);
    return query;
  }

  async #consume(query: Query) {
    try {
      for await (const message of query) await this.#handle(message);
    } catch (error) {
      if (this.#turn) this.#fail(this.#turn, error);
      return;
    }
    if (this.#turn) this.#fail(this.#turn, new Error("Claude Code stopped unexpectedly."));
  }

  async #handle(message: SDKMessage) {
    const turn = this.#turn;
    if (!turn) return;

    for (const event of turn.transcript.events(message)) turn.emit(event);
    if (message.type !== "result") return;

    if (turn.stopped) {
      // Stopping means "never mind", so a half-finished edit is put back.
      if (turn.transcript.edited) await this.#query?.rewindFiles(turn.id);
    } else if (message.subtype === "success") {
      turn.emit({ type: "done", turnId: turn.id });
    } else {
      turn.emit({ type: "error", message: message.errors[0] ?? "Claude Code couldn't finish this change." });
    }
    turn.finish();
  }

  async #beforeEdit(input: HookInput): Promise<SyncHookJSONOutput> {
    const file = editedFile(input);
    if (file) await this.#turn?.check.beforeEdit(path.resolve(this.#options.projectRoot, file));
    return {};
  }

  /** Sends Claude back to fix any errors its edits introduced, instead of letting it finish. */
  async #beforeFinishing(): Promise<SyncHookJSONOutput> {
    const turn = this.#turn;
    if (!turn || turn.stopped || turn.check.files.length === 0) return {};
    const problems = await turn.check.introducedProblems();
    if (problems === null) return {};

    turn.checks += 1;
    turn.emit({
      type: "check",
      id: `${turn.id}:check:${turn.checks}`,
      status: problems.length === 0 ? "passed" : "failed",
      files: turn.check.files.map((file) => path.basename(file)),
      problems: problems.map((problem) => `${path.basename(problem.file)}, line ${problem.line}: ${problem.message}`),
    });
    if (problems.length === 0 || turn.checks > MAX_FIX_ROUNDS) return {};
    return { decision: "block", reason: fixRequest(problems, this.#options.projectRoot) };
  }

  #fail(turn: Turn, error: unknown) {
    turn.emit({ type: "error", message: error instanceof Error ? error.message : String(error) });
    turn.finish();
  }
}

function queryOptions(options: AgentSessionOptions): Options {
  return {
    cwd: options.projectRoot,
    additionalDirectories: options.additionalDirectories,
    model: options.model,
    systemPrompt: { type: "preset", preset: "claude_code", append: STYLUS_INSTRUCTIONS },
    tools: TOOLS,
    allowedTools: TOOLS,
    permissionMode: "dontAsk",
    settingSources: ["project"],
    enableFileCheckpointing: true,
    includePartialMessages: true,
    thinking: { type: "adaptive", display: "summarized" },
  };
}

function editedFile(input: HookInput): string | null {
  if (input.hook_event_name !== "PreToolUse") return null;
  const toolInput = input.tool_input;
  if (typeof toolInput !== "object" || toolInput === null || !("file_path" in toolInput)) return null;
  return typeof toolInput.file_path === "string" ? toolInput.file_path : null;
}

function fixRequest(problems: Problem[], projectRoot: string) {
  const lines = problems.map(
    (problem) => `- ${path.relative(projectRoot, problem.file)}, line ${problem.line}: ${problem.message}`,
  );
  return [
    "A type check of the files you edited found errors your edits introduced:",
    ...lines,
    "Fix them without changing anything else. Then reply as before, with one short sentence describing the change as the developer will see it.",
  ].join("\n");
}

function userMessage(id: UUID, content: TurnContent): SDKUserMessage {
  return {
    type: "user",
    uuid: id,
    session_id: "",
    parent_tool_use_id: null,
    message: { role: "user", content },
  };
}
