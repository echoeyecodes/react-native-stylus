import path from "node:path";
import type { SDKMessage, SDKPartialAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import type { ToolName } from "../shared/protocol.js";
import type { TranscriptEvent } from "./agent.js";
import type { EditTracker } from "./edit-tracker.js";

const TOOLS: ReadonlySet<string> = new Set<ToolName>(["Read", "Edit", "Write", "Glob", "Grep"]);
const EDIT_TOOLS: ReadonlySet<string> = new Set<ToolName>(["Edit", "Write"]);

type StreamEvent = SDKPartialAssistantMessage["event"];

/** Tool input comes from the finished assistant message, not the partial stream. */
export class ClaudeTranscript {
  #messageId = "";
  /** Content block index → part id, for the current message. */
  #parts = new Map<number, string>();
  #tools = new Set<string>();
  /** Tool call id → edited file. */
  #edits = new Map<string, string>();

  async events(message: SDKMessage, edits: EditTracker): Promise<TranscriptEvent[]> {
    if ("parent_tool_use_id" in message && message.parent_tool_use_id !== null) return [];
    if (message.type === "stream_event") return this.#stream(message.event);
    if (message.type === "assistant") return this.#toolInputs(message.message.content, edits);
    if (message.type === "user" && Array.isArray(message.message.content)) {
      return this.#toolResults(message.message.content, edits);
    }
    return [];
  }

  #stream(event: StreamEvent): TranscriptEvent[] {
    switch (event.type) {
      case "message_start":
        this.#messageId = event.message.id;
        this.#parts.clear();
        return [];
      case "content_block_start": {
        const block = event.content_block;
        const id = `${this.#messageId}:${event.index}`;
        if (block.type === "thinking") return this.#open(event.index, id, { type: "reasoning", id });
        if (block.type === "text") return this.#open(event.index, id, { type: "text", id });
        if (block.type === "tool_use" && TOOLS.has(block.name)) {
          this.#tools.add(block.id);
          return this.#open(event.index, block.id, { type: "tool", id: block.id, name: block.name as ToolName });
        }
        return [];
      }
      case "content_block_delta": {
        const id = this.#parts.get(event.index);
        if (!id) return [];
        if (event.delta.type === "text_delta") return [{ type: "delta", id, text: event.delta.text }];
        if (event.delta.type === "thinking_delta") return [{ type: "delta", id, text: event.delta.thinking }];
        return [];
      }
      case "content_block_stop": {
        const id = this.#parts.get(event.index);
        return id ? [{ type: "end", id }] : [];
      }
      default:
        return [];
    }
  }

  #open(index: number, id: string, event: TranscriptEvent): TranscriptEvent[] {
    this.#parts.set(index, id);
    return [event];
  }

  #toolInputs(content: readonly { type: string }[], edits: EditTracker): TranscriptEvent[] {
    return content.flatMap((block): TranscriptEvent[] => {
      if (block.type !== "tool_use" || !("id" in block) || typeof block.id !== "string") return [];
      if (!this.#tools.has(block.id)) return [];
      const input = "input" in block ? block.input : null;
      const file = filePathOf(input);
      if (file && "name" in block && EDIT_TOOLS.has(String(block.name))) {
        this.#edits.set(block.id, file);
        edits.touch(file);
      }
      return [{ type: "tool-input", id: block.id, detail: detailOf(input) }];
    });
  }

  async #toolResults(content: readonly unknown[], edits: EditTracker): Promise<TranscriptEvent[]> {
    const events: TranscriptEvent[] = [];
    for (const block of content) {
      if (!isToolResult(block) || !this.#tools.has(block.tool_use_id)) continue;
      const file = this.#edits.get(block.tool_use_id);
      const diff = file !== undefined && !block.is_error ? await edits.record(file) : null;
      events.push({ type: "tool-result", id: block.tool_use_id, ok: !block.is_error, diff });
    }
    return events;
  }
}

function filePathOf(input: unknown): string | null {
  if (typeof input !== "object" || input === null || !("file_path" in input)) return null;
  return typeof input.file_path === "string" ? input.file_path : null;
}

/** File name or search pattern. */
function detailOf(input: unknown): string | null {
  const file = filePathOf(input);
  if (file) return path.basename(file);
  if (typeof input === "object" && input !== null && "pattern" in input && typeof input.pattern === "string") {
    return input.pattern;
  }
  return null;
}

function isToolResult(block: unknown): block is { tool_use_id: string; is_error?: boolean } {
  return (
    typeof block === "object" &&
    block !== null &&
    "type" in block &&
    block.type === "tool_result" &&
    "tool_use_id" in block &&
    typeof block.tool_use_id === "string"
  );
}
