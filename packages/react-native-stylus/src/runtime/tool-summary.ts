import type { DiffHunk, ToolName } from "../shared/protocol";

const VERBS: Record<ToolName, { running: string; done: string; fallback: string }> = {
  Read: { running: "Reading", done: "Read", fallback: "a file" },
  Edit: { running: "Editing", done: "Edited", fallback: "a file" },
  Write: { running: "Writing", done: "Wrote", fallback: "a file" },
  Grep: { running: "Searching for", done: "Searched for", fallback: "code" },
  Glob: { running: "Finding", done: "Found", fallback: "files" },
  Run: { running: "Running", done: "Ran", fallback: "a command" },
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
