import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { AcpAgent, type AcpCommand } from "./acp-agent.js";
import type { Agent, AgentOptions } from "./agent.js";
import { ClaudeAgent } from "./claude-agent.js";

const CODEX_ADAPTER = "@agentclientprotocol/codex-acp";

/** Codex needs its ACP adapter in the project; a custom command must speak ACP over stdio. */
export type AgentChoice =
  | "claude"
  | "codex"
  | "opencode"
  | { name?: string; command: string; args?: string[]; env?: Record<string, string> };

export function createAgent(choice: AgentChoice, options: AgentOptions): Agent {
  switch (choice) {
    case "claude":
      return new ClaudeAgent(options);
    case "codex":
      return new AcpAgent("Codex", () => codexAdapter(options.projectRoot), options);
    case "opencode":
      return new AcpAgent("OpenCode", () => ({ command: "opencode", args: ["acp"] }), options);
    default:
      return new AcpAgent(
        choice.name ?? path.basename(choice.command),
        () => ({ command: choice.command, args: choice.args ?? [], env: choice.env }),
        options,
      );
  }
}

/** Uses the project's install so the adapter version follows its lockfile. */
function codexAdapter(projectRoot: string): AcpCommand {
  const require = createRequire(path.join(projectRoot, "package.json"));
  let manifest: string;
  try {
    manifest = require.resolve(`${CODEX_ADAPTER}/package.json`);
  } catch {
    throw new Error(`Add ${CODEX_ADAPTER} to the project's dev dependencies to use Codex.`);
  }
  const { bin } = JSON.parse(readFileSync(manifest, "utf8")) as { bin: string | Record<string, string> };
  const script = typeof bin === "string" ? bin : Object.values(bin)[0];
  if (!script) throw new Error(`${CODEX_ADAPTER} has no executable.`);
  return { command: process.execPath, args: [path.join(path.dirname(manifest), script)] };
}
