import {
  ROUTE_PREFIX,
  type AddTurnResponse,
  type CreateThreadRequest,
  type CreateThreadResponse,
  type NewTurn,
  type StylusEvent,
  type VerifyRequest,
} from "../shared/protocol";
import { errorMessage, HttpError, streamNdjson, type NdjsonStream } from "./stream-ndjson";

/** Doubles up to `MAX_RECONNECT_MS` while Metro stays away. */
const RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 8000;

export type StylusClient = ReturnType<typeof createStylusClient>;

export function createStylusClient(origin: string) {
  const base = `${origin}${ROUTE_PREFIX}`;

  async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 404 && path === "/warm") throw new SetupError();
    if (!response.ok) throw new Error(errorMessage(await response.text(), response.status));
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }

  return {
    origin,

    /** Reconnects after Metro restarts or the network drops. Returns an unsubscribe function. */
    subscribe(onEvent: (event: StylusEvent) => void, onSetupError: (error: SetupError) => void) {
      let stream: NdjsonStream | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let closed = false;
      let delay = RECONNECT_MS;

      const retry = () => {
        if (closed) return;
        timer = setTimeout(connect, delay);
        delay = Math.min(delay * 2, MAX_RECONNECT_MS);
      };

      const connect = () => {
        stream = streamNdjson<StylusEvent>(`${base}/events`, (event) => {
          delay = RECONNECT_MS;
          onEvent(event);
        });
        stream.done.then(retry, (error: unknown) => {
          // Without the Stylus routes there is nothing to reconnect to.
          if (error instanceof HttpError && error.status === 404) return onSetupError(new SetupError());
          retry();
        });
      };

      connect();
      return () => {
        closed = true;
        if (timer) clearTimeout(timer);
        stream?.close();
      };
    },

    /** Starts the agent early so it's ready by the first request. */
    warm: () => send<void>("POST", "/warm"),

    createThread: (request: CreateThreadRequest) => send<CreateThreadResponse>("POST", "/threads", request),

    addTurn: (threadId: string, turn: NewTurn) => send<AddTurnResponse>("POST", `/threads/${threadId}/turns`, turn),

    removeThread: (threadId: string) => send<void>("DELETE", `/threads/${threadId}`),

    stop: (turnId: string) => send<void>("POST", `/turns/${turnId}/stop`),

    undo: (turnId: string) => send<void>("POST", `/turns/${turnId}/undo`),

    verify: (turnId: string, request: VerifyRequest) => send<void>("POST", `/turns/${turnId}/verify`, request),
  };
}

/** Metro answered without the Stylus routes, so `withStylus` isn't in its config. */
export class SetupError extends Error {
  constructor() {
    super("Add withStylus to your Metro config, then restart Metro.");
  }
}
