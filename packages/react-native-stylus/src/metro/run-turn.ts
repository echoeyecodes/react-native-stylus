import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { TurnEvent } from "../shared/protocol.js";
import type { Agent, Prompt, PromptOutcome, PromptTurn } from "./agent.js";
import type { Checkpoints } from "./checkpoints.js";
import type { CodeChecker, Problem } from "./code-checker.js";
import { EditTracker } from "./edit-tracker.js";
import { checkedFiles, introducedProblems } from "./turn-check.js";

/** Rounds the agent gets to fix type errors it introduced. */
const MAX_FIX_ROUNDS = 2;
const STOP_TIMEOUT_MS = 5000;

type TurnSetup = {
  id: string;
  agent: Agent;
  checker: CodeChecker;
  checkpoints: Checkpoints | null;
  projectRoot: string;
  prompt: Prompt;
  emit: (event: TurnEvent) => void;
  signal: AbortSignal;
};

export type TurnResult = {
  /** Snapshot id that undo restores; null outside git. */
  before: string | null;
  /** Files the turn changed and kept. */
  files: string[];
  finished: boolean;
  /** The agent failed or ignored a stop and should be replaced. */
  agentBroken: boolean;
};

/** Feeds introduced type errors back to the agent; a stop puts the files back. */
export async function runTurn({ id, agent, checker, checkpoints, projectRoot, prompt, emit, signal }: TurnSetup) {
  const before = checkpoints ? await checkpoints.snapshot().catch(() => null) : null;
  const edits = new EditTracker(checkpoints, before, projectRoot);
  const turn: PromptTurn = { emit, edits };
  const result = (finished: boolean, files: string[], agentBroken = false): TurnResult => ({
    before,
    files,
    finished,
    agentBroken,
  });

  const kept = async () => {
    if (!checkpoints || !before) return edits.files;
    const changed = new Set(await checkpoints.changed(before, await checkpoints.snapshot()));
    return edits.files.filter((file) => changed.has(file));
  };
  const putBack = async () => {
    if (checkpoints && before) await checkpoints.restore(before, edits.files);
  };

  let next = prompt;
  for (let checks = 0; ; ) {
    let outcome: PromptOutcome;
    try {
      outcome = await untilStopped(agent.prompt(next, turn, signal), signal);
    } catch (error) {
      if (signal.aborted) {
        await putBack();
        return result(false, [], true);
      }
      emit({ type: "error", message: error instanceof Error ? error.message : String(error) });
      return result(false, await kept(), true);
    }

    if (outcome.type === "stopped") {
      await putBack();
      return result(false, []);
    }
    if (outcome.type === "error") {
      emit(outcome);
      return result(false, await kept());
    }

    const files = await kept();
    const problems =
      checkpoints && before && checkedFiles(files).length > 0
        ? await introducedProblems(checker, checkpoints, before, files)
        : null;
    if (problems !== null) {
      checks += 1;
      emit({
        type: "check",
        id: `${id}:check:${checks}`,
        status: problems.length === 0 ? "passed" : "failed",
        files: checkedFiles(files).map((file) => path.basename(file)),
        problems: problems.map((problem) => `${path.basename(problem.file)}, line ${problem.line}: ${problem.message}`),
      });
    }
    if (problems === null || problems.length === 0 || checks > MAX_FIX_ROUNDS) {
      emit({ type: "done", edited: files.length > 0 });
      return result(true, files);
    }
    next = { content: [{ type: "text", text: fixRequest(problems, projectRoot) }], seen: [] };
  }
}

/** Rejects when the prompt hasn't ended `STOP_TIMEOUT_MS` after a stop. */
function untilStopped<T>(prompt: Promise<T>, signal: AbortSignal): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const expire = () =>
      void delay(STOP_TIMEOUT_MS).then(() => reject(new Error("The agent didn't stop in time.")));
    if (signal.aborted) expire();
    else signal.addEventListener("abort", expire, { once: true });
  });
  return Promise.race([prompt, timeout]);
}

function fixRequest(problems: Problem[], projectRoot: string) {
  const lines = problems.map(
    (problem) => `- ${path.relative(projectRoot, problem.file)}, line ${problem.line}: ${problem.message}`,
  );
  return [
    "A type check of the files you edited found errors your edits introduced:",
    ...lines,
    "Fix them without changing anything else. Then reply as before, with one short sentence describing the change as the developer will see it.",
  ].join("\n");
}
