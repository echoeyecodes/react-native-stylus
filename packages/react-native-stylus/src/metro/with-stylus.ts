import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
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
  /** The Claude model that makes the edits. Defaults to Sonnet. */
  model?: string;
};

/**
 * Adds Stylus to a Metro config. The app's `<Stylus>` sends requests to these routes, and
 * Claude Code edits the project they describe.
 */
export function withStylus<T extends MetroConfigLike>(config: T, options: StylusOptions = {}): T {
  const projectRoot = config.projectRoot ?? process.cwd();
  const handle = createStylusRoutes({
    projectRoot,
    additionalDirectories: (config.watchFolders ?? []).filter(
      (folder) => !isInside(folder, projectRoot) && path.basename(folder) !== "node_modules",
    ),
    model: options.model ?? "sonnet",
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
