import type { Anchor, StylusEvent, ThreadSnapshot } from "../shared/protocol";
import { applyLogEntry, turnFromSnapshot, type Turn } from "./turns";

export type Thread = {
  id: string;
  /** Null for a thread about the whole app. */
  anchor: Anchor | null;
  turns: Turn[];
};

export type Threads = {
  list: Thread[];
  /** The only turn Undo can be offered on right now. */
  undoable: string | null;
};

export const NO_THREADS: Threads = { list: [], undoable: null };

export function applyStylusEvent(threads: Threads, event: StylusEvent): Threads {
  switch (event.type) {
    case "snapshot":
      return { list: event.threads.map(threadFromSnapshot), undoable: event.undoable };
    case "thread-added":
      if (threads.list.some((thread) => thread.id === event.thread.id)) return threads;
      return { ...threads, list: [...threads.list, threadFromSnapshot(event.thread)] };
    case "thread-removed":
      return { ...threads, list: threads.list.filter((thread) => thread.id !== event.threadId) };
    case "turn-added":
      return {
        ...threads,
        list: threads.list.map((thread) =>
          thread.id === event.threadId ? { ...thread, turns: [...thread.turns, turnFromSnapshot(event.turn)] } : thread,
        ),
      };
    case "turn-log":
      return {
        ...threads,
        list: threads.list.map((thread) =>
          thread.turns.some((turn) => turn.id === event.turnId)
            ? {
                ...thread,
                turns: thread.turns.map((turn) => (turn.id === event.turnId ? applyLogEntry(turn, event.entry) : turn)),
              }
            : thread,
        ),
      };
    case "undoable":
      return { ...threads, undoable: event.turnId };
  }
}

export function findTurn(threads: Threads, turnId: string): { thread: Thread; turn: Turn } | null {
  for (const thread of threads.list) {
    const turn = thread.turns.find((candidate) => candidate.id === turnId);
    if (turn) return { thread, turn };
  }
  return null;
}

export function isEditing(threads: Threads) {
  return threads.list.some((thread) => thread.turns.some((turn) => turn.status === "running"));
}

export function threadName(thread: Thread) {
  return thread.anchor?.components[thread.anchor.selected]?.name ?? "App";
}

function threadFromSnapshot(snapshot: ThreadSnapshot): Thread {
  return { id: snapshot.id, anchor: snapshot.anchor, turns: snapshot.turns.map(turnFromSnapshot) };
}
