import path from "node:path";
import { Worker } from "node:worker_threads";
import type { CheckRequest, CheckResponse, Problem } from "./code-check-protocol.js";

export type { Problem };

/** Uses the project's own TypeScript. */
export class CodeChecker {
  readonly #worker: Worker;
  readonly #pending = new Map<number, (problems: Problem[] | null) => void>();
  #nextId = 0;
  #stopped = false;

  constructor(projectRoot: string) {
    this.#worker = new Worker(path.join(__dirname, "code-check-worker.js"), { workerData: { projectRoot } });
    this.#worker.on("message", ({ id, problems }: CheckResponse) => {
      this.#pending.get(id)?.(problems);
      this.#pending.delete(id);
    });
    // A checker that can't run leaves edits unchecked rather than blocking them.
    this.#worker.on("error", () => this.#stop());
    this.#worker.on("exit", () => this.#stop());
    this.#worker.unref();
  }

  /** Null when the project can't be checked. */
  problems(file: string, contents?: string): Promise<Problem[] | null> {
    if (this.#stopped) return Promise.resolve(null);
    return new Promise((resolve) => {
      const id = this.#nextId++;
      this.#pending.set(id, resolve);
      const request: CheckRequest = { id, file, contents };
      this.#worker.postMessage(request);
    });
  }

  #stop() {
    this.#stopped = true;
    for (const resolve of this.#pending.values()) resolve(null);
    this.#pending.clear();
  }
}
