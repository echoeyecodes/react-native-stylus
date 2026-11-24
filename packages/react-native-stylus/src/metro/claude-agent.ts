import type { Options, Query, SDKMessage, SDKUserMessage, WarmQuery } from "@anthropic-ai/claude-agent-sdk";
import type { Agent, AgentOptions, Prompt, PromptContent, PromptOutcome, PromptTurn } from "./agent.js";
import { ClaudeTranscript } from "./claude-transcript.js";
import { STYLUS_INSTRUCTIONS } from "./instructions.js";
import { MessageQueue } from "./message-queue.js";

const TOOLS = ["Read", "Edit", "Write", "Glob", "Grep"];
const DEFAULT_MODEL = "sonnet";

type Running = {
  turn: PromptTurn;
  transcript: ClaudeTranscript;
  stopped: boolean;
  finish: (outcome: PromptOutcome) => void;
  fail: (error: unknown) => void;
};

export class ClaudeAgent implements Agent {
  readonly #warm: Promise<WarmQuery>;
  readonly #inbox = new MessageQueue<SDKUserMessage>();
  #query: Query | null = null;
  #running: Running | null = null;

  constructor(options: AgentOptions) {
    // The CLI takes seconds to start, so it warms up before the first prompt.
    this.#warm = import("@anthropic-ai/claude-agent-sdk").then(({ startup }) =>
      startup({ options: queryOptions(options) }),
    );
    // Avoids an unhandled rejection; the first prompt reports the failure.
    this.#warm.catch(() => {});
  }

  async prompt({ content, seen }: Prompt, turn: PromptTurn, signal: AbortSignal): Promise<PromptOutcome> {
    const query = await this.#open();
    await Promise.all(seen.map(({ file, mtimeMs }) => query.seedReadState(file, mtimeMs)));
    if (signal.aborted) return { type: "stopped" };

    return new Promise((resolve, reject) => {
      const running: Running = {
        turn,
        transcript: new ClaudeTranscript(),
        stopped: false,
        finish: (outcome) => {
          this.#running = null;
          resolve(outcome);
        },
        fail: (error) => {
          this.#running = null;
          reject(error);
        },
      };
      this.#running = running;
      signal.addEventListener(
        "abort",
        () => {
          running.stopped = true;
          void query.interrupt();
        },
        { once: true },
      );
      this.#inbox.push(userMessage(content));
    });
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
      this.#running?.fail(error);
      return;
    }
    this.#running?.fail(new Error("Claude Code stopped unexpectedly."));
  }

  async #handle(message: SDKMessage) {
    const running = this.#running;
    if (!running) return;

    for (const event of await running.transcript.events(message, running.turn.edits)) running.turn.emit(event);
    if (message.type !== "result") return;

    if (running.stopped) running.finish({ type: "stopped" });
    else if (message.subtype === "success") running.finish({ type: "done" });
    else running.finish({ type: "error", message: message.errors[0] ?? "Claude Code couldn't finish this change." });
  }
}

function queryOptions(options: AgentOptions): Options {
  return {
    cwd: options.projectRoot,
    additionalDirectories: options.additionalDirectories,
    model: options.model ?? DEFAULT_MODEL,
    systemPrompt: { type: "preset", preset: "claude_code", append: STYLUS_INSTRUCTIONS },
    tools: TOOLS,
    allowedTools: TOOLS,
    permissionMode: "dontAsk",
    settingSources: ["project"],
    includePartialMessages: true,
    thinking: { type: "adaptive", display: "summarized" },
  };
}

function userMessage(content: PromptContent): SDKUserMessage {
  return {
    type: "user",
    parent_tool_use_id: null,
    message: {
      role: "user",
      content: content.map((block) =>
        block.type === "text"
          ? { type: "text", text: block.text }
          : { type: "image", source: { type: "base64", media_type: block.mimeType, data: block.base64 } },
      ),
    },
  };
}
