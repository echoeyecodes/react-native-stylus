import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { TurnComponent } from "../shared/protocol.js";

/** Larger files are left for the agent to read in parts. */
const MAX_LINES = 800;

export type PickedSource = {
  file: string;
  /** Numbered like Claude Code's Read output, so edits can quote it exactly. */
  numbered: string;
  mtimeMs: number;
};

/** Paths come from the network, so only files inside `roots` are read. */
export async function readPickedSource(component: TurnComponent, roots: string[]): Promise<PickedSource | null> {
  const file = path.resolve(component.location.file);
  if (!roots.some((root) => isInside(file, root))) return null;
  const [contents, stats] = await Promise.all([readFile(file, "utf8"), stat(file)]);
  const lines = contents.split("\n");
  if (lines.length > MAX_LINES) return null;
  const width = String(lines.length).length;
  return {
    file,
    numbered: lines.map((line, index) => `${String(index + 1).padStart(width)}\t${line}`).join("\n"),
    mtimeMs: Math.floor(stats.mtimeMs),
  };
}

function isInside(file: string, root: string) {
  const relative = path.relative(root, file);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}
