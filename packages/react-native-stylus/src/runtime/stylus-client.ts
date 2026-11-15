import {
  ROUTE_PREFIX,
  type CreateSessionResponse,
  type TurnEvent,
  type TurnRequest,
  type UndoRequest,
} from "../shared/protocol";
import { postNdjson, type NdjsonRequest } from "./post-ndjson";

export type StylusClient = ReturnType<typeof createStylusClient>;

export function createStylusClient(origin: string) {
  const base = `${origin}${ROUTE_PREFIX}`;

  return {
    origin,

    async createSession(): Promise<string> {
      const response = await fetch(`${base}/sessions`, { method: "POST" });
      if (response.status === 404) throw new SetupError();
      if (!response.ok) throw new Error(`Metro couldn't start a Stylus session (${response.status}).`);
      return ((await response.json()) as CreateSessionResponse).sessionId;
    },

    runTurn(sessionId: string, request: TurnRequest, onEvent: (event: TurnEvent) => void): NdjsonRequest {
      return postNdjson<TurnEvent>(`${base}/sessions/${sessionId}/turns`, request, onEvent);
    },

    async undo(sessionId: string, turnId: string) {
      const body: UndoRequest = { turnId };
      const response = await fetch(`${base}/sessions/${sessionId}/undo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(((await response.json()) as { message: string }).message);
    },

    endSession(sessionId: string) {
      return fetch(`${base}/sessions/${sessionId}`, { method: "DELETE" });
    },
  };
}

/** Metro answered without the Stylus routes, so `withStylus` isn't in its config. */
export class SetupError extends Error {
  constructor() {
    super("Add withStylus to your Metro config, then restart Metro.");
  }
}
