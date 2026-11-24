import { readFile } from "node:fs/promises";
import path from "node:path";
import { structuredPatch } from "diff";
import type { DiffHunk } from "../shared/protocol.js";
import { realFile, type Checkpoints } from "./checkpoints.js";

/** Enough for a typical edit on a phone; larger diffs are cut off. */
const MAX_DIFF_LINES = 120;

/** A file's first diff is taken against the snapshot from before the turn. */
export class EditTracker {
  readonly #checkpoints: Checkpoints | null;
  readonly #before: string | null;
  readonly #projectRoot: string;
  /** Contents after each file's latest edit; null when deleted. */
  readonly #latest = new Map<string, string | null>();
  /** Includes edits started but not yet reported. */
  readonly #touched = new Set<string>();

  constructor(checkpoints: Checkpoints | null, before: string | null, projectRoot: string) {
    this.#checkpoints = checkpoints;
    this.#before = before;
    this.#projectRoot = projectRoot;
  }

  /** Real paths of every file the turn may have changed. */
  get files() {
    return [...this.#touched];
  }

  /** Lets a stop restore the file even if the edit never reports back. */
  touch(file: string) {
    this.#touched.add(this.#absolute(file));
  }

  /** Returns the edit's diff, or null when the original is unknown. */
  async record(file: string): Promise<DiffHunk[] | null> {
    const absolute = this.#absolute(file);
    this.#touched.add(absolute);
    const previous = this.#latest.has(absolute) ? this.#latest.get(absolute) : await this.#original(absolute);
    const current = await readFile(absolute, "utf8").catch(() => null);
    this.#latest.set(absolute, current);
    return previous === undefined ? null : hunks(previous ?? "", current ?? "");
  }

  #absolute(file: string) {
    return realFile(path.resolve(this.#projectRoot, file));
  }

  async #original(file: string) {
    if (!this.#checkpoints || !this.#before) return undefined;
    const contents = await this.#checkpoints.read(this.#before, file);
    return contents === undefined || contents === null ? contents : contents.toString("utf8");
  }
}

function hunks(before: string, after: string): DiffHunk[] | null {
  const result: DiffHunk[] = [];
  let budget = MAX_DIFF_LINES;
  for (const hunk of structuredPatch("", "", before, after, "", "", { context: 3 }).hunks) {
    if (budget <= 0) break;
    const lines = hunk.lines.filter((line) => !line.startsWith("\\")).slice(0, budget);
    budget -= lines.length;
    result.push({ oldStart: hunk.oldStart, newStart: hunk.newStart, lines });
  }
  return result.length > 0 ? result : null;
}
