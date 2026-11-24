import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { AgentChoice } from "./create-agent.js";
import { createStylusRoutes } from "./stylus-routes.js";

type Middleware = (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => void;

type MetroConfigLike = {
  projectRoot?: string;
  watchFolders?: readonly string[];
  server?: {
    enhanceMiddleware?: (middleware: Middleware, server: unknown) => Middleware;
  };
};

export type StylusOptions = {
  /** Defaults to Claude Code. */
  agent?: AgentChoice;
  /** In the agent's own naming. Defaults to Sonnet for Claude, otherwise the agent's default. */
  model?: string;
};

/** Adds the routes the app's `<Stylus>` talks to. */
export function withStylus<T extends MetroConfigLike>(config: T, options: StylusOptions = {}): T {
  const projectRoot = config.projectRoot ?? process.cwd();
  const handle = createStylusRoutes({
    projectRoot,
    additionalDirectories: (config.watchFolders ?? []).filter(
      (folder) => !isInside(folder, projectRoot) && path.basename(folder) !== "node_modules",
    ),
    agent: options.agent ?? "claude",
    model: options.model ?? null,
  });
  const enhanceMiddleware = config.server?.enhanceMiddleware;

  return {
    ...config,
    server: {
      ...config.server,
      enhanceMiddleware(middleware: Middleware, server: unknown): Middleware {
        const next = enhanceMiddleware ? enhanceMiddleware(middleware, server) : middleware;
        return (req, res, fallthrough) => {
          if (!handle(req, res)) next(req, res, fallthrough);
        };
      },
    },
  };
}

function isInside(folder: string, root: string) {
  const relative = path.relative(root, folder);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}
