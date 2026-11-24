import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { Readable, Writable } from "node:stream";
import type {
  ClientConnection,
  ContentBlock,
  RequestPermissionRequest,
  RequestPermissionResponse,
  SessionUpdate,
  StopReason,
} from "@agentclientprotocol/sdk";
import type { Agent, AgentOptions, Prompt, PromptContent, PromptOutcome, PromptTurn } from "./agent.js";
import { AcpTranscript } from "./acp-transcript.js";
import { STYLUS_INSTRUCTIONS } from "./instructions.js";

/** Allowed only for paths inside the project roots. */
const ALLOWED_KINDS = new Set(["read", "search", "edit", "delete", "move"]);
/** Characters of stderr kept to explain a failure. */
const STDERR_TAIL = 2000;

export type AcpCommand = {
  command: string;
  args: string[];
  env?: Record<string, string>;
};

type Session = {
  connection: ClientConnection;
  id: string;
  images: boolean;
  /** Prepended to the first prompt when the agent can't take a system prompt. */
  instructions: string | null;
};

type Running = { turn: PromptTurn; transcript: AcpTranscript };

export class AcpAgent implements Agent {
  readonly #name: string;
  readonly #options: AgentOptions;
  readonly #session: Promise<Session>;
  #child: ChildProcess | null = null;
  #stderr = "";
  #running: Running | null = null;
  /** Serializes session updates in arrival order. */
  #updates: Promise<void> = Promise.resolve();

  /** `command` is lazy so a missing install surfaces on the first prompt. */
  constructor(name: string, command: () => AcpCommand, options: AgentOptions) {
    this.#name = name;
    this.#options = options;
    this.#session = this.#start(command);
    // Avoids an unhandled rejection; the first prompt reports the failure.
    this.#session.catch(() => {});
  }

  async prompt({ content }: Prompt, turn: PromptTurn, signal: AbortSignal): Promise<PromptOutcome> {
    const session = await this.#session;
    if (signal.aborted) return { type: "stopped" };

    const running: Running = { turn, transcript: new AcpTranscript() };
    this.#running = running;
    const cancel = () => void session.connection.agent.notify("session/cancel", { sessionId: session.id });
    signal.addEventListener("abort", cancel, { once: true });

    const prompt = promptBlocks(content, session.images);
    if (session.instructions) {
      prompt.unshift({ type: "text", text: session.instructions });
      session.instructions = null;
    }

    try {
      const { stopReason } = await session.connection.agent.request("session/prompt", {
        sessionId: session.id,
        prompt,
      });
      await this.#updates;
      for (const event of running.transcript.finish()) turn.emit(event);
      return signal.aborted ? { type: "stopped" } : outcomeOf(stopReason, this.#name);
    } catch (error) {
      throw this.#explain(error);
    } finally {
      signal.removeEventListener("abort", cancel);
      this.#running = null;
    }
  }

  close() {
    void this.#session.then(
      ({ connection }) => connection.close(),
      () => {},
    );
    this.#child?.kill();
  }

  async #start(resolve: () => AcpCommand): Promise<Session> {
    const acp = await import("@agentclientprotocol/sdk");
    const { command, args, env } = resolve();
    const child = spawn(command, args, {
      cwd: this.#options.projectRoot,
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.#child = child;
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => (this.#stderr = (this.#stderr + chunk).slice(-STDERR_TAIL)));
    const spawned = new Promise<void>((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    await spawned.catch((error: unknown) => {
      throw new Error(`Couldn't start ${this.#name}: ${error instanceof Error ? error.message : error}`);
    });

    const stream = acp.ndJsonStream(
      Writable.toWeb(child.stdin) as WritableStream<Uint8Array>,
      Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>,
    );
    const connection = acp
      .client({ name: "stylus" })
      .onNotification("session/update", ({ params }) => this.#update(params.update))
      .onRequest("session/request_permission", ({ params }) => this.#permission(params))
      .connect(stream);

    try {
      const { agentCapabilities } = await connection.agent.request("initialize", {
        protocolVersion: acp.PROTOCOL_VERSION,
        clientCapabilities: {},
        clientInfo: { name: "stylus", version: "0.1.0" },
      });
      const sessions = agentCapabilities?.sessionCapabilities;
      const { sessionId, configOptions } = await connection.agent.request("session/new", {
        cwd: this.#options.projectRoot,
        mcpServers: [],
        ...(sessions?.additionalDirectories && { additionalDirectories: this.#options.additionalDirectories }),
        ...(sessions?.systemPrompt && {
          systemPrompt: { mode: "append" as const, content: [{ type: "text" as const, text: STYLUS_INSTRUCTIONS }] },
        }),
      });

      const { model } = this.#options;
      const modelOption = configOptions?.find((option) => option.category === "model");
      if (model && modelOption) {
        await connection.agent.request("session/set_config_option", {
          sessionId,
          configId: modelOption.id,
          value: model,
        });
      }

      return {
        connection,
        id: sessionId,
        images: agentCapabilities?.promptCapabilities?.image === true,
        instructions: sessions?.systemPrompt ? null : `Instructions for this session:\n${STYLUS_INSTRUCTIONS}`,
      };
    } catch (error) {
      connection.close();
      child.kill();
      throw this.#explain(error);
    }
  }

  #update(update: SessionUpdate) {
    const running = this.#running;
    if (!running) return;
    this.#updates = this.#updates.then(async () => {
      for (const event of await running.transcript.events(update, running.turn.edits)) running.turn.emit(event);
    });
  }

  #permission({ toolCall, options }: RequestPermissionRequest): RequestPermissionResponse {
    const roots = [this.#options.projectRoot, ...this.#options.additionalDirectories];
    const inside = (toolCall.locations ?? []).every(({ path: file }) => roots.some((root) => isInside(file, root)));
    const allowed = toolCall.kind != null && ALLOWED_KINDS.has(toolCall.kind) && inside;
    const option = options.find(({ kind }) => kind === (allowed ? "allow_once" : "reject_once"));
    return { outcome: option ? { outcome: "selected", optionId: option.optionId } : { outcome: "cancelled" } };
  }

  /** Appends the agent's last stderr line, which usually names the cause. */
  #explain(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const data = typeof error === "object" && error !== null && "data" in error ? detailOf(error.data) : null;
    const stderr = this.#stderr.trim().split("\n").at(-1);
    return new Error(`${this.#name}: ${data ?? message}${!data && stderr ? ` (${stderr})` : ""}`);
  }
}

function promptBlocks(content: PromptContent, images: boolean): ContentBlock[] {
  return content.flatMap((block): ContentBlock[] => {
    if (block.type === "text") return [{ type: "text", text: block.text }];
    return images ? [{ type: "image", mimeType: block.mimeType, data: block.base64 }] : [];
  });
}

function outcomeOf(stopReason: StopReason, name: string): PromptOutcome {
  switch (stopReason) {
    case "end_turn":
      return { type: "done" };
    case "cancelled":
      return { type: "stopped" };
    case "refusal":
      return { type: "error", message: `${name} declined this request.` };
    default:
      return { type: "error", message: `${name} ran out of room before finishing this change.` };
  }
}

/** Codex nests the real message as JSON in the error's data. */
function detailOf(data: unknown): string | null {
  if (typeof data === "string") {
    try {
      return detailOf(JSON.parse(data)) ?? data;
    } catch {
      return data;
    }
  }
  if (typeof data !== "object" || data === null) return null;
  if ("error" in data) {
    const nested = detailOf(data.error);
    if (nested) return nested;
  }
  return "message" in data ? detailOf(data.message) : null;
}

function isInside(file: string, root: string) {
  const relative = path.relative(root, path.resolve(root, file));
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}
