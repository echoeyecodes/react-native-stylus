import path from "node:path";
import type { SDKMessage, SDKPartialAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import type { DiffHunk, ToolName, TurnEvent } from "../shared/protocol.js";

const TOOLS: ReadonlySet<string> = new Set<ToolName>(["Read", "Edit", "Write", "Glob", "Grep"]);
/** Enough to read a typical edit on a phone; larger diffs are cut off. */
const MAX_DIFF_LINES = 120;

type StreamEvent = SDKPartialAssistantMessage["event"];

/**
 * Turns the SDK's messages for one turn into transcript events. Reasoning and text stream in
 * through partial messages; tool calls get their input from the finished assistant message and
 * their outcome from the tool result that follows.
 */
export class TurnTranscript {
  #messageId = "";
  /** Content block index in the current message → part id, for blocks shown in the transcript. */
  #parts = new Map<number, string>();
  #tools = new Set<string>();
  #edited = false;

  /** Whether any file was changed during the turn. */
  get edited() {
    return this.#edited;
  }

  events(message: SDKMessage): TurnEvent[] {
    if ("parent_tool_use_id" in message && message.parent_tool_use_id !== null) return [];
    if (message.type === "stream_event") return this.#stream(message.event);
    if (message.type === "assistant") return this.#toolInputs(message.message.content);
    if (message.type === "user" && Array.isArray(message.message.content)) {
      return this.#toolResults(message.message.content, message.tool_use_result);
    }
    return [];
  }

  #stream(event: StreamEvent): TurnEvent[] {
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

  #open(index: number, id: string, event: TurnEvent): TurnEvent[] {
    this.#parts.set(index, id);
    return [event];
  }

  #toolInputs(content: readonly { type: string }[]): TurnEvent[] {
    return content.flatMap((block): TurnEvent[] => {
      if (block.type !== "tool_use" || !("id" in block) || typeof block.id !== "string") return [];
      if (!this.#tools.has(block.id)) return [];
      return [{ type: "tool-input", id: block.id, detail: detailOf("input" in block ? block.input : null) }];
    });
  }

  #toolResults(content: readonly unknown[], toolUseResult: unknown): TurnEvent[] {
    return content.flatMap((block): TurnEvent[] => {
      if (!isToolResult(block) || !this.#tools.has(block.tool_use_id)) return [];
      const diff = block.is_error ? null : diffOf(toolUseResult);
      if (diff) this.#edited = true;
      return [{ type: "tool-result", id: block.tool_use_id, ok: !block.is_error, diff }];
    });
  }
}

/** A file name for file tools, the pattern for searches. */
function detailOf(input: unknown): string | null {
  if (typeof input !== "object" || input === null) return null;
  if ("file_path" in input && typeof input.file_path === "string") return path.basename(input.file_path);
  if ("pattern" in input && typeof input.pattern === "string") return input.pattern;
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

function diffOf(result: unknown): DiffHunk[] | null {
  if (typeof result !== "object" || result === null || !("structuredPatch" in result)) return null;
  if (!Array.isArray(result.structuredPatch)) return null;

  const hunks: DiffHunk[] = [];
  let budget = MAX_DIFF_LINES;
  for (const hunk of result.structuredPatch as { oldStart: number; newStart: number; lines: string[] }[]) {
    if (budget <= 0) break;
    const lines = hunk.lines.slice(0, budget);
    budget -= lines.length;
    hunks.push({ oldStart: hunk.oldStart, newStart: hunk.newStart, lines });
  }
  return hunks.length > 0 ? hunks : null;
}
