import type { DiffHunk, ToolName } from "../shared/protocol";
import type { Turn } from "./turns";

const VERBS: Record<ToolName, { running: string; done: string; fallback: string }> = {
  Read: { running: "Reading", done: "Read", fallback: "a file" },
  Edit: { running: "Editing", done: "Edited", fallback: "a file" },
  Write: { running: "Writing", done: "Wrote", fallback: "a file" },
  Grep: { running: "Searching for", done: "Searched for", fallback: "code" },
  Glob: { running: "Finding", done: "Found", fallback: "files" },
};

export function describeTool(name: ToolName, detail: string | null, running: boolean) {
  const verb = VERBS[name];
  return `${running ? verb.running : verb.done} ${detail ?? verb.fallback}`;
}

export type LineCounts = { added: number; removed: number };

export function countChanges(diff: DiffHunk[]): LineCounts {
  let added = 0;
  let removed = 0;
  for (const line of diff.flatMap((hunk) => hunk.lines)) {
    if (line.startsWith("+")) added += 1;
    else if (line.startsWith("-")) removed += 1;
  }
  return { added, removed };
}

/** The files a turn edited and how many lines it changed across them. */
export function turnChanges(turn: Turn): LineCounts & { files: string[] } {
  const files = new Set<string>();
  let added = 0;
  let removed = 0;
  for (const part of turn.parts) {
    if (part.kind !== "tool" || !part.diff) continue;
    if (part.detail) files.add(part.detail);
    const counts = countChanges(part.diff);
    added += counts.added;
    removed += counts.removed;
  }
  return { files: [...files], added, removed };
}

/** What Claude is doing right now, for a turn that hasn't finished. */
export function currentStep(turn: Turn) {
  if (turn.status === "checking") return "Checking on device";
  const last = turn.parts.at(-1);
  switch (last?.kind) {
    case "tool":
      return last.status === "running" ? describeTool(last.name, last.detail, true) : "Thinking";
    case "check":
      return last.status === "failed" ? "Fixing type errors" : "Finishing up";
    case "text":
      return "Writing a reply";
    default:
      return "Thinking";
  }
}

/** The first sentence of Claude's last reply, without markdown. */
export function replySummary(turn: Turn) {
  const reply = turn.parts.findLast((part) => part.kind === "text" && part.text.trim() !== "");
  if (reply?.kind !== "text") return null;
  const plain = reply.text.trim().replace(/[`*]/g, "");
  const sentence = /^.+?[.!?](?=\s|$)/s.exec(plain)?.[0] ?? plain;
  return sentence.replace(/\s+/g, " ");
}
