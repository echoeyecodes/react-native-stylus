import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { parentPort, workerData } from "node:worker_threads";
import type TypeScript from "typescript";
import type { CheckRequest, CheckResponse, Problem } from "./code-check-protocol.js";

/**
 * Keeps a TypeScript language service for the project, so each check only re-reads the files that
 * changed. Runs in its own thread because the checks are synchronous and would otherwise stall Metro.
 */
const { projectRoot } = workerData as { projectRoot: string };
const port = parentPort;
if (!port) throw new Error("code-check-worker must run as a worker thread.");

const service = createService(projectRoot);
// Loads the type information once up front, so the first real check is quick.
service?.warmUp();

port.on("message", (request: CheckRequest) => {
  const response: CheckResponse = { id: request.id, problems: service ? service.problems(request.file) : null };
  port.postMessage(response);
});

function createService(root: string) {
  let ts: typeof TypeScript;
  try {
    ts = createRequire(path.join(root, "package.json"))("typescript") as typeof TypeScript;
  } catch {
    return null;
  }

  const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
  const parsed = configPath
    ? ts.getParsedCommandLineOfConfigFile(configPath, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} })
    : undefined;
  const options: TypeScript.CompilerOptions = parsed?.options ?? {
    allowJs: true,
    jsx: ts.JsxEmit.ReactJSX,
    noEmit: true,
  };
  const files = new Set(parsed?.fileNames ?? []);
  /** Without a tsconfig, types would be guesses, so only syntax is checked. */
  const syntaxOnly = !parsed;

  const host: TypeScript.LanguageServiceHost = {
    getScriptFileNames: () => [...files],
    getScriptVersion: (file) => (existsSync(file) ? String(statSync(file).mtimeMs) : "missing"),
    getScriptSnapshot: (file) =>
      existsSync(file) ? ts.ScriptSnapshot.fromString(readFileSync(file, "utf8")) : undefined,
    getCurrentDirectory: () => root,
    getCompilationSettings: () => options,
    getDefaultLibFileName: (compilerOptions) => ts.getDefaultLibFilePath(compilerOptions),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };
  const languageService = ts.createLanguageService(host, ts.createDocumentRegistry());

  return {
    warmUp() {
      const [first] = files;
      if (first && !syntaxOnly) languageService.getSemanticDiagnostics(first);
    },
    problems(file: string): Problem[] {
      files.add(file);
      if (!existsSync(file)) return [];
      const diagnostics = syntaxOnly
        ? languageService.getSyntacticDiagnostics(file)
        : [...languageService.getSyntacticDiagnostics(file), ...languageService.getSemanticDiagnostics(file)];
      return diagnostics
        .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
        .map((diagnostic) => ({
          file,
          line:
            diagnostic.file && diagnostic.start !== undefined
              ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1
              : 0,
          message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
        }));
    },
  };
}
