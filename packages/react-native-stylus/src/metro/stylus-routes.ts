import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ROUTE_PREFIX,
  type CreateSessionResponse,
  type ErrorResponse,
  type TurnEvent,
  type TurnRequest,
  type UndoRequest,
} from "../shared/protocol.js";
import { AgentSession, type AgentSessionOptions } from "./agent-session.js";
import { CodeChecker } from "./code-checker.js";
import { readPickedSource } from "./picked-source.js";
import { readJsonBody } from "./read-json-body.js";
import { turnContent } from "./turn-content.js";

/** Sessions the developer walked away from are closed so their Claude Code process exits. */
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

const SESSION_PATH = new RegExp(`^${ROUTE_PREFIX}/sessions/([\\w-]+)(?:/(turns|undo))?$`);

type Entry = { session: AgentSession; idleTimer: NodeJS.Timeout };

/**
 * Handles Stylus requests from the app. Returns false for any other request so Metro can serve it.
 */
export function createStylusRoutes(options: AgentSessionOptions) {
  const sessions = new Map<string, Entry>();
  /** Started with the first session, so projects that never use Stylus don't pay for TypeScript. */
  let checker: CodeChecker | null = null;

  function idleTimer(id: string) {
    return setTimeout(() => close(id), IDLE_TIMEOUT_MS);
  }

  function touch(entry: Entry) {
    clearTimeout(entry.idleTimer);
    entry.idleTimer = idleTimer(entry.session.id);
  }

  function close(id: string) {
    const entry = sessions.get(id);
    if (!entry) return;
    clearTimeout(entry.idleTimer);
    entry.session.close();
    sessions.delete(id);
  }

  function createSession(res: ServerResponse) {
    checker ??= new CodeChecker(options.projectRoot);
    const session = new AgentSession(options, checker);
    sessions.set(session.id, { session, idleTimer: idleTimer(session.id) });
    sendJson<CreateSessionResponse>(res, 201, { sessionId: session.id });
  }

  async function runTurn(req: IncomingMessage, res: ServerResponse, entry: Entry) {
    if (entry.session.isRunning)
      return sendJson<ErrorResponse>(res, 409, { message: "A change is already in progress." });
    const request = (await readJsonBody(req)) as TurnRequest;
    touch(entry);

    const stop = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) stop.abort();
    });

    res.writeHead(200, { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" });
    const emit = (event: TurnEvent) => {
      if (!res.writableEnded) res.write(`${JSON.stringify(event)}\n`);
    };
    const source = await readPickedSource(request, [options.projectRoot, ...options.additionalDirectories]);
    const seen = source ? [{ file: source.file, mtimeMs: source.mtimeMs }] : [];
    await entry.session.run(turnContent(request, source, options.projectRoot), seen, emit, stop.signal);
    touch(entry);
    res.end();
  }

  async function undo(req: IncomingMessage, res: ServerResponse, entry: Entry) {
    const { turnId } = (await readJsonBody(req)) as UndoRequest;
    touch(entry);
    await entry.session.undo(turnId);
    res.writeHead(204).end();
  }

  async function route(req: IncomingMessage, res: ServerResponse) {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;

    if (pathname === `${ROUTE_PREFIX}/sessions` && req.method === "POST") return createSession(res);

    const match = SESSION_PATH.exec(pathname);
    const entry = match?.[1] ? sessions.get(match[1]) : undefined;
    if (!match || !entry) return sendJson<ErrorResponse>(res, 404, { message: "This Stylus session has ended." });

    const action = match[2];
    if (action === "turns" && req.method === "POST") return runTurn(req, res, entry);
    if (action === "undo" && req.method === "POST") return undo(req, res, entry);
    if (action === undefined && req.method === "DELETE") {
      close(entry.session.id);
      res.writeHead(204).end();
      return;
    }
    sendJson<ErrorResponse>(res, 405, { message: "Method not allowed." });
  }

  return function handle(req: IncomingMessage, res: ServerResponse): boolean {
    if (!req.url?.startsWith(ROUTE_PREFIX)) return false;
    route(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (res.headersSent) res.end();
      else sendJson<ErrorResponse>(res, 500, { message });
    });
    return true;
  };
}

function sendJson<T>(res: ServerResponse, status: number, body: T) {
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}
