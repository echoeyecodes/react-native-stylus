import type { CodeChecker, Problem } from "./code-checker.js";

/**
 * Tracks the files one turn edits and finds the errors the turn introduced. Errors a file already
 * had before the turn touched it are not the turn's to fix, so they are left out.
 */
export class TurnCheck {
  readonly #checker: CodeChecker;
  readonly #before = new Map<string, Promise<Problem[] | null>>();

  constructor(checker: CodeChecker) {
    this.#checker = checker;
  }

  /** Call before each edit; the first call per file records its errors, and later ones wait for that. */
  async beforeEdit(file: string) {
    if (!this.#before.has(file)) this.#before.set(file, this.#checker.problems(file));
    await this.#before.get(file);
  }

  get files() {
    return [...this.#before.keys()];
  }

  /** Errors in the edited files that weren't there before, or null when the project can't be checked. */
  async introducedProblems(): Promise<Problem[] | null> {
    const introduced: Problem[] = [];
    for (const [file, before] of this.#before) {
      const after = await this.#checker.problems(file);
      if (after === null) return null;
      const existing = countByMessage((await before) ?? []);
      for (const problem of after) {
        const remaining = existing.get(problem.message) ?? 0;
        if (remaining > 0) existing.set(problem.message, remaining - 1);
        else introduced.push(problem);
      }
    }
    return introduced;
  }
}

function countByMessage(problems: Problem[]) {
  const counts = new Map<string, number>();
  for (const { message } of problems) counts.set(message, (counts.get(message) ?? 0) + 1);
  return counts;
}
