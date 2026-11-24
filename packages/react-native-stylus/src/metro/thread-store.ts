import { randomUUID, type UUID } from "node:crypto";
import type {
  Anchor,
  CreateThreadRequest,
  CreateThreadResponse,
  NewTurn,
  StylusEvent,
  ThreadSnapshot,
  TurnComponent,
  TurnLogEntry,
  TurnOrigin,
  TurnSnapshot,
  VerifyRequest,
} from "../shared/protocol.js";
import type { Agent, AgentOptions } from "./agent.js";
import { Checkpoints } from "./checkpoints.js";
import { CodeChecker } from "./code-checker.js";
import { createAgent, type AgentChoice } from "./create-agent.js";
import { readPickedSource } from "./picked-source.js";
import { runTurn } from "./run-turn.js";
import { targetOf, turnContent } from "./turn-content.js";

export type ThreadStoreOptions = AgentOptions & { agent: AgentChoice };

/** How long a turn waits for the app to verify it. */
const VERIFY_TIMEOUT_MS = 15_000;
/** Target for a request about the whole app. */
const APP_TARGET: TurnComponent = { name: "App", location: { file: "", line: 0 } };

type Thread = { id: UUID; anchor: Anchor | null; turns: Turn[] };

type TurnStatus = "queued" | "running" | "verifying" | "finished" | "stopped" | "undone";

type Turn = {
  id: UUID;
  thread: Thread;
  text: string;
  origin: TurnOrigin;
  repairs: string | null;
  target: TurnComponent;
  log: TurnLogEntry[];
  status: TurnStatus;
  /** Snapshot id that undo restores. */
  before: string | null;
  /** Includes changes from a turn that failed partway. */
  files: string[];
};

/** Kept off `Turn` so the screenshot is dropped once the turn starts. */
type QueuedTurn = { turn: Turn; request: NewTurn };

type Listener = (event: StylusEvent) => void;

/** Turns from every thread run one at a time through a single agent conversation. */
export class ThreadStore {
  readonly #options: ThreadStoreOptions;
  readonly #threads = new Map<string, Thread>();
  /** Only turns of threads that still exist. */
  readonly #turns = new Map<string, Turn>();
  /** Start order across every thread, including removed ones. */
  #history: Turn[] = [];
  #queue: QueuedTurn[] = [];
  /** Running or awaiting verification. */
  #current: { turn: Turn; stop: AbortController } | null = null;
  #verification: { turn: Turn; finish: (entry: TurnLogEntry) => void } | null = null;
  #undoing = false;
  #undoable: string | null = null;
  #session: Agent | null = null;
  /** Created lazily so projects that never use Stylus don't load TypeScript. */
  #checker: CodeChecker | null = null;
  #checkpoints: Promise<Checkpoints | null> | null = null;
  readonly #listeners = new Set<Listener>();

  constructor(options: ThreadStoreOptions) {
    this.#options = options;
  }

  warm() {
    this.#agent();
  }

  /** Sends a snapshot first. Returns an unsubscribe function. */
  subscribe(listener: Listener) {
    listener({ type: "snapshot", threads: [...this.#threads.values()].map(threadSnapshot), undoable: this.#undoable });
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  hasThread(id: string) {
    return this.#threads.has(id);
  }

  hasTurn(id: string) {
    return this.#turns.has(id);
  }

  createThread({ anchor, turn: request }: CreateThreadRequest): CreateThreadResponse {
    this.#agent();
    const thread: Thread = { id: randomUUID(), anchor, turns: [] };
    this.#threads.set(thread.id, thread);
    const turn = this.#createTurn(thread, request);
    this.#broadcast({ type: "thread-added", thread: threadSnapshot(thread) });
    this.#enqueue(turn, request);
    return { threadId: thread.id, turnId: turn.id };
  }

  addTurn(threadId: string, request: NewTurn): string {
    const turn = this.#createTurn(this.#thread(threadId), request);
    this.#broadcast({ type: "turn-added", threadId, turn: turnSnapshot(turn) });
    this.#enqueue(turn, request);
    return turn.id;
  }

  /** Changes made by its finished turns stay. */
  removeThread(threadId: string) {
    const thread = this.#thread(threadId);
    for (const turn of thread.turns) this.#stop(turn);
    if (this.#verification?.turn.thread === thread) this.#verification.finish({ type: "unverified" });
    for (const turn of thread.turns) this.#turns.delete(turn.id);
    this.#threads.delete(thread.id);
    this.#broadcast({ type: "thread-removed", threadId: thread.id });
    this.#updateUndoable();
    this.#closeIfIdle();
  }

  stop(turnId: string) {
    this.#stop(this.#turn(turnId));
    this.#updateUndoable();
  }

  /** Unblocks the queue. */
  verify(turnId: string, problem: VerifyRequest["problem"]) {
    if (this.#verification?.turn.id === turnId) this.#verification.finish({ type: "verified", problem });
  }

  /** Also undoes every later turn's edits. */
  async undo(turnId: string) {
    const turn = this.#turn(turnId);
    if (this.#current || this.#queue.length > 0 || this.#undoing) {
      throw new Error("Wait for the current change to finish before undoing.");
    }
    const checkpoints = await this.#snapshots();
    if (turn.status !== "finished" || turn.files.length === 0 || !turn.before || !checkpoints) {
      throw new Error("This change can't be undone.");
    }

    this.#undoing = true;
    try {
      const undone = this.#history
        .slice(this.#history.indexOf(turn))
        .filter((later) => later.status === "finished" && later.files.length > 0);
      await checkpoints.restore(turn.before, [...new Set(undone.flatMap((later) => later.files))]);
      for (const later of undone) {
        later.status = "undone";
        this.#log(later, { type: "undone" });
      }
    } finally {
      this.#undoing = false;
      this.#updateUndoable();
      void this.#drain();
    }
  }

  #agent() {
    this.#checker ??= new CodeChecker(this.#options.projectRoot);
    this.#session ??= createAgent(this.#options.agent, this.#options);
    return this.#session;
  }

  #snapshots() {
    this.#checkpoints ??= Checkpoints.open([this.#options.projectRoot, ...this.#options.additionalDirectories]);
    return this.#checkpoints;
  }

  #thread(id: string) {
    const thread = this.#threads.get(id);
    if (!thread) throw new Error(`No thread ${id}.`);
    return thread;
  }

  #turn(id: string) {
    const turn = this.#turns.get(id);
    if (!turn) throw new Error(`No turn ${id}.`);
    return turn;
  }

  #createTurn(thread: Thread, request: NewTurn): Turn {
    const turn: Turn = {
      id: randomUUID(),
      thread,
      text: request.text,
      origin: request.origin,
      repairs: request.repairs,
      target: targetOf(thread.anchor, request) ?? APP_TARGET,
      log: [],
      status: "queued",
      before: null,
      files: [],
    };
    thread.turns.push(turn);
    this.#turns.set(turn.id, turn);
    return turn;
  }

  #enqueue(turn: Turn, request: NewTurn) {
    // Repairs go ahead of other waiting requests, behind earlier repairs.
    const index = turn.origin === "repair" ? this.#queue.findIndex(({ turn }) => turn.origin !== "repair") : -1;
    this.#queue.splice(index === -1 ? this.#queue.length : index, 0, { turn, request });
    this.#updateUndoable();
    void this.#drain();
  }

  async #drain() {
    if (this.#current || this.#undoing) return;
    for (let next = this.#queue.shift(); next; next = this.#queue.shift()) {
      const stop = new AbortController();
      this.#current = { turn: next.turn, stop };
      await this.#run(next.turn, next.request, stop.signal);
      this.#current = null;
    }
    this.#updateUndoable();
    this.#closeIfIdle();
  }

  async #run(turn: Turn, request: NewTurn, signal: AbortSignal) {
    turn.status = "running";
    this.#history.push(turn);
    this.#log(turn, { type: "started", at: Date.now() });

    const { anchor } = turn.thread;
    const target = targetOf(anchor, request);
    const roots = [this.#options.projectRoot, ...this.#options.additionalDirectories];
    // The inlined source only saves the agent a read, so failures are ignored.
    const source = target ? await readPickedSource(target, roots).catch(() => null) : null;
    if (signal.aborted) return;

    const content = turnContent(
      { anchor, turn: request, earlier: earlierRequests(turn) },
      source,
      this.#options.projectRoot,
    );
    const agent = this.#agent();
    const result = await runTurn({
      id: turn.id,
      agent,
      checker: this.#checker!,
      checkpoints: await this.#snapshots(),
      projectRoot: this.#options.projectRoot,
      prompt: { content, seen: source ? [{ file: source.file, mtimeMs: source.mtimeMs }] : [] },
      emit: (event) => {
        if (turn.status === "running") this.#log(turn, { type: "transcript", event, at: Date.now() });
      },
      signal,
    });
    turn.before = result.before;
    turn.files = result.files;
    if (result.agentBroken && this.#session === agent) {
      agent.close();
      this.#session = null;
    }
    if (turn.status !== "running") return;

    // A repair is checked even when it changed nothing, since its point is that the crash is gone.
    if (result.finished && (turn.files.length > 0 || turn.origin === "repair")) await this.#verify(turn);
    turn.status = "finished";
  }

  /** Holds the queue so the next turn's edits don't mix with this one's. */
  #verify(turn: Turn) {
    turn.status = "verifying";
    return new Promise<void>((resolve) => {
      const finish = (entry: TurnLogEntry) => {
        clearTimeout(timeout);
        this.#verification = null;
        this.#log(turn, entry);
        resolve();
      };
      const timeout = setTimeout(() => finish({ type: "unverified" }), VERIFY_TIMEOUT_MS);
      this.#verification = { turn, finish };
    });
  }

  /** A running turn's edits are put back once it ends. */
  #stop(turn: Turn) {
    if (turn.status === "queued") this.#queue = this.#queue.filter((queued) => queued.turn !== turn);
    else if (turn.status === "running") this.#current?.stop.abort();
    else return;
    turn.status = "stopped";
    this.#log(turn, { type: "stopped", at: Date.now() });
  }

  #closeIfIdle() {
    if (this.#threads.size > 0 || this.#current || !this.#session) return;
    this.#session.close();
    this.#session = null;
    this.#history = [];
  }

  #updateUndoable() {
    const undoable = this.#findUndoable();
    if (undoable === this.#undoable) return;
    this.#undoable = undoable;
    this.#broadcast({ type: "undoable", turnId: undoable });
  }

  /** Undo rewinds every later turn too, so only the latest change qualifies. */
  #findUndoable() {
    if (this.#current || this.#queue.length > 0) return null;
    const latest = this.#history.findLast((turn) => turn.status === "finished" && turn.files.length > 0);
    return latest?.before && this.#threads.has(latest.thread.id) ? latest.id : null;
  }

  #log(turn: Turn, entry: TurnLogEntry) {
    turn.log.push(entry);
    this.#broadcast({ type: "turn-log", turnId: turn.id, entry });
  }

  #broadcast(event: StylusEvent) {
    for (const listener of this.#listeners) listener(event);
  }
}

function earlierRequests(turn: Turn) {
  const { turns } = turn.thread;
  return turns
    .slice(0, turns.indexOf(turn))
    .filter((earlier) => earlier.origin === "developer" && earlier.status !== "stopped")
    .map((earlier) => earlier.text);
}

function threadSnapshot({ id, anchor, turns }: Thread): ThreadSnapshot {
  return { id, anchor, turns: turns.map(turnSnapshot) };
}

function turnSnapshot({ id, text, origin, repairs, target, log }: Turn): TurnSnapshot {
  return { id, text, origin, repairs, target, log };
}
