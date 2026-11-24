import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ROUTE_PREFIX,
  type AddTurnResponse,
  type CreateThreadRequest,
  type CreateThreadResponse,
  type ErrorResponse,
  type NewTurn,
  type VerifyRequest,
} from "../shared/protocol.js";
import type { AgentSessionOptions } from "./agent-session.js";
import { readJsonBody } from "./read-json-body.js";
import { ThreadStore } from "./thread-store.js";

/** An event stream that stays silent for long gets dropped, so it sends a blank line this often. */
const KEEPALIVE_MS = 25_000;
const THREAD_GONE = "This thread was removed.";
const TURN_GONE = "This request was removed.";

type Route = {
  method: string;
  /** Matched against the path after `ROUTE_PREFIX`; its first group is passed on as `id`. */
  path: RegExp;
  handle: (req: IncomingMessage, res: ServerResponse, id: string) => unknown;
};

/**
 * Handles Stylus requests from the app. Returns false for any other request so Metro can serve it.
 */
export function createStylusRoutes(options: AgentSessionOptions) {
  const store = new ThreadStore(options);

  function warm(_req: IncomingMessage, res: ServerResponse) {
    store.warm();
    res.writeHead(204).end();
  }

  function events(_req: IncomingMessage, res: ServerResponse) {
    res.writeHead(200, { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" });
    const unsubscribe = store.subscribe((event) => res.write(`${JSON.stringify(event)}\n`));
    const keepalive = setInterval(() => res.write("\n"), KEEPALIVE_MS);
    res.on("close", () => {
      clearInterval(keepalive);
      unsubscribe();
    });
  }

  async function createThread(req: IncomingMessage, res: ServerResponse) {
    const request = (await readJsonBody(req)) as CreateThreadRequest;
    sendJson<CreateThreadResponse>(res, 201, store.createThread(request));
  }

  async function addTurn(req: IncomingMessage, res: ServerResponse, threadId: string) {
    const turn = (await readJsonBody(req)) as NewTurn;
    if (!store.hasThread(threadId)) return sendError(res, 404, THREAD_GONE);
    sendJson<AddTurnResponse>(res, 201, { turnId: store.addTurn(threadId, turn) });
  }

  function removeThread(_req: IncomingMessage, res: ServerResponse, threadId: string) {
    if (!store.hasThread(threadId)) return sendError(res, 404, THREAD_GONE);
    store.removeThread(threadId);
    res.writeHead(204).end();
  }

  function stopTurn(_req: IncomingMessage, res: ServerResponse, turnId: string) {
    if (!store.hasTurn(turnId)) return sendError(res, 404, TURN_GONE);
    store.stop(turnId);
    res.writeHead(204).end();
  }

  async function undoTurn(_req: IncomingMessage, res: ServerResponse, turnId: string) {
    if (!store.hasTurn(turnId)) return sendError(res, 404, TURN_GONE);
    try {
      await store.undo(turnId);
    } catch (error) {
      return sendError(res, 409, messageOf(error));
    }
    res.writeHead(204).end();
  }

  async function verifyTurn(req: IncomingMessage, res: ServerResponse, turnId: string) {
    const { problem } = (await readJsonBody(req)) as VerifyRequest;
    if (!store.hasTurn(turnId)) return sendError(res, 404, TURN_GONE);
    store.verify(turnId, problem);
    res.writeHead(204).end();
  }

  const routes: Route[] = [
    { method: "POST", path: /^\/warm$/, handle: warm },
    { method: "GET", path: /^\/events$/, handle: events },
    { method: "POST", path: /^\/threads$/, handle: createThread },
    { method: "DELETE", path: /^\/threads\/([\w-]+)$/, handle: removeThread },
    { method: "POST", path: /^\/threads\/([\w-]+)\/turns$/, handle: addTurn },
    { method: "POST", path: /^\/turns\/([\w-]+)\/stop$/, handle: stopTurn },
    { method: "POST", path: /^\/turns\/([\w-]+)\/undo$/, handle: undoTurn },
    { method: "POST", path: /^\/turns\/([\w-]+)\/verify$/, handle: verifyTurn },
  ];

  async function route(req: IncomingMessage, res: ServerResponse) {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname.slice(ROUTE_PREFIX.length);
    let found = false;
    for (const { method, path, handle } of routes) {
      const match = path.exec(pathname);
      if (!match) continue;
      if (req.method === method) return handle(req, res, match[1] ?? "");
      found = true;
    }
    if (found) sendError(res, 405, "Method not allowed.");
    else sendError(res, 404, "Not found.");
  }

  return function handle(req: IncomingMessage, res: ServerResponse): boolean {
    if (!req.url?.startsWith(ROUTE_PREFIX)) return false;
    route(req, res).catch((error: unknown) => {
      if (res.headersSent) res.end();
      else sendError(res, 500, messageOf(error));
    });
    return true;
  };
}

function sendJson<T>(res: ServerResponse, status: number, body: T) {
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}

function sendError(res: ServerResponse, status: number, message: string) {
  sendJson<ErrorResponse>(res, status, { message });
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
