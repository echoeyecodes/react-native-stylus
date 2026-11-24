import path from "node:path";
import type { Checkpoints } from "./checkpoints.js";
import type { CodeChecker, Problem } from "./code-checker.js";

const CHECKED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"]);

/** Errors a file had before the turn are left out; null when the project can't be checked. */
export async function introducedProblems(
  checker: CodeChecker,
  checkpoints: Checkpoints,
  before: string,
  files: string[],
): Promise<Problem[] | null> {
  const introduced: Problem[] = [];
  for (const file of checkedFiles(files)) {
    const original = await checkpoints.read(before, file);
    const earlier = original ? await checker.problems(file, original.toString("utf8")) : [];
    const after = await checker.problems(file);
    if (earlier === null || after === null) return null;

    const existing = countByMessage(earlier);
    for (const problem of after) {
      const remaining = existing.get(problem.message) ?? 0;
      if (remaining > 0) existing.set(problem.message, remaining - 1);
      else introduced.push(problem);
    }
  }
  return introduced;
}

export function checkedFiles(files: string[]) {
  return files.filter((file) => CHECKED_EXTENSIONS.has(path.extname(file)));
}

function countByMessage(problems: Problem[]) {
  const counts = new Map<string, number>();
  for (const { message } of problems) counts.set(message, (counts.get(message) ?? 0) + 1);
  return counts;
}
