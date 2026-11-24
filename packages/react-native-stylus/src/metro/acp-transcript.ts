import path from "node:path";
import type { SessionUpdate, ToolCallContent, ToolCallLocation, ToolKind } from "@agentclientprotocol/sdk";
import type { DiffHunk, ToolName } from "../shared/protocol.js";
import type { TranscriptEvent } from "./agent.js";
import type { EditTracker } from "./edit-tracker.js";

const TOOL_NAMES: Partial<Record<ToolKind, ToolName>> = {
  read: "Read",
  search: "Grep",
  edit: "Edit",
  delete: "Edit",
  move: "Edit",
  execute: "Run",
};

type Tool = {
  name: ToolName;
  title: string;
  input: unknown;
  files: Set<string>;
  described: boolean;
  finished: boolean;
};

/** Tool calls of kinds the transcript has no name for, such as fetches, are dropped. */
export class AcpTranscript {
  #open: { id: string; kind: "reasoning" | "text" } | null = null;
  /** Splits text around tool calls for agents that don't give messages ids. */
  #segment = 0;
  #tools = new Map<string, Tool | null>();

  async events(update: SessionUpdate, edits: EditTracker): Promise<TranscriptEvent[]> {
    switch (update.sessionUpdate) {
      case "agent_thought_chunk":
      case "agent_message_chunk": {
        if (update.content.type !== "text") return [];
        const kind = update.sessionUpdate === "agent_thought_chunk" ? "reasoning" : "text";
        const id = `${update.messageId ?? `part-${this.#segment}`}:${kind}`;
        const events = this.#open?.id === id ? [] : [...this.finish(), { type: kind, id } as const];
        this.#open = { id, kind };
        return [...events, { type: "delta", id, text: update.content.text }];
      }
      case "tool_call": {
        if (this.#tools.has(update.toolCallId)) return this.#toolUpdate(update.toolCallId, update, edits);
        const events = this.finish();
        this.#segment += 1;
        const name = update.kind ? TOOL_NAMES[update.kind] : undefined;
        if (!name) {
          this.#tools.set(update.toolCallId, null);
          return events;
        }
        this.#tools.set(update.toolCallId, {
          name,
          title: update.title,
          input: undefined,
          files: new Set(),
          described: false,
          finished: false,
        });
        events.push({ type: "tool", id: update.toolCallId, name });
        return [...events, ...(await this.#toolUpdate(update.toolCallId, update, edits))];
      }
      case "tool_call_update":
        return this.#toolUpdate(update.toolCallId, update, edits);
      default:
        return [];
    }
  }

  finish(): TranscriptEvent[] {
    if (!this.#open) return [];
    const { id } = this.#open;
    this.#open = null;
    return [{ type: "end", id }];
  }

  async #toolUpdate(
    id: string,
    update: {
      title?: string | null;
      rawInput?: unknown;
      status?: string | null;
      content?: ToolCallContent[] | null;
      locations?: ToolCallLocation[] | null;
    },
    edits: EditTracker,
  ): Promise<TranscriptEvent[]> {
    const tool = this.#tools.get(id);
    if (!tool || tool.finished) return [];
    if (update.title) tool.title = update.title;
    if (update.rawInput !== undefined) tool.input = update.rawInput;
    for (const location of update.locations ?? []) tool.files.add(location.path);
    for (const content of update.content ?? []) if (content.type === "diff") tool.files.add(content.path);
    if (tool.name === "Edit") for (const file of tool.files) edits.touch(file);

    const events: TranscriptEvent[] = [];
    const detail = detailOf(tool);
    if (detail && !tool.described) {
      tool.described = true;
      events.push({ type: "tool-input", id, detail });
    }
    if (update.status !== "completed" && update.status !== "failed") return events;

    tool.finished = true;
    const ok = update.status === "completed";
    let diff: DiffHunk[] | null = null;
    if (ok && tool.name === "Edit") {
      for (const file of tool.files) diff = [...(diff ?? []), ...((await edits.record(file)) ?? [])];
    }
    events.push({ type: "tool-result", id, ok, diff: diff && diff.length > 0 ? diff : null });
    return events;
  }
}

/** File name, search pattern or command line. */
function detailOf(tool: Tool): string | null {
  const input = typeof tool.input === "object" && tool.input !== null ? (tool.input as Record<string, unknown>) : {};
  if (tool.name === "Run") {
    const command = input.command;
    if (typeof command === "string") return command;
    if (Array.isArray(command)) return command.join(" ");
    return tool.title || null;
  }
  if (tool.name === "Grep") {
    for (const key of ["pattern", "query"]) if (typeof input[key] === "string") return input[key];
    return null;
  }
  const [file] = tool.files;
  if (file) return path.basename(file);
  for (const key of ["filePath", "file_path", "path"]) if (typeof input[key] === "string") return path.basename(input[key]);
  return null;
}
