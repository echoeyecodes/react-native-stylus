import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const MAX_BUFFER = 64 * 1024 * 1024;

/** Snapshots as git trees, built in a separate index so the developer's staging area is untouched. */
export class Checkpoints {
  readonly #top: string;
  readonly #paths: string[];
  readonly #env: NodeJS.ProcessEnv;

  private constructor(top: string, paths: string[]) {
    this.#top = top;
    this.#paths = paths;
    const index = path.join(tmpdir(), `stylus-${createHash("sha1").update(top).digest("hex").slice(0, 12)}.index`);
    this.#env = { ...process.env, GIT_INDEX_FILE: index };
  }

  /** Null outside git; roots outside the first root's repository are ignored. */
  static async open(roots: string[]): Promise<Checkpoints | null> {
    const [first] = roots;
    if (!first) return null;
    const top = await git(first, ["rev-parse", "--show-toplevel"]).then(
      (output) => output.trim(),
      () => null,
    );
    if (!top) return null;
    const paths = roots
      .map((root) => path.relative(top, realFile(root)))
      .filter((relative) => !relative.startsWith("..") && !path.isAbsolute(relative));
    return new Checkpoints(top, paths.map((relative) => relative || "."));
  }

  covers(file: string) {
    const relative = path.relative(this.#top, realFile(file));
    if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
    return this.#paths.some((root) => root === "." || relative === root || relative.startsWith(`${root}${path.sep}`));
  }

  /** Gitignored files are left out. */
  async snapshot(): Promise<string> {
    await git(this.#top, ["add", "--all", "--", ...this.#paths], this.#env);
    return (await git(this.#top, ["write-tree"], this.#env)).trim();
  }

  /** Null when the file didn't exist, undefined when the snapshot doesn't cover it. */
  async read(snapshot: string, file: string): Promise<Buffer | null | undefined> {
    if (!this.covers(file)) return undefined;
    const object = `${snapshot}:${this.#relative(file)}`;
    return run("git", ["cat-file", "--filters", object], { cwd: this.#top, maxBuffer: MAX_BUFFER, encoding: "buffer" }).then(
      ({ stdout }) => stdout,
      () => null,
    );
  }

  /** Returns symlink-resolved absolute paths. */
  async changed(from: string, to: string): Promise<string[]> {
    const output = await git(this.#top, ["diff-tree", "-r", "-z", "--name-only", "--no-renames", from, to]);
    return output
      .split("\0")
      .filter(Boolean)
      .map((relative) => path.join(this.#top, relative));
  }

  /** Deletes files the snapshot didn't have. */
  async restore(snapshot: string, files: string[]) {
    for (const file of files) {
      const contents = await this.read(snapshot, file);
      if (contents === undefined) continue;
      if (contents === null) {
        await unlink(file).catch(() => {});
        continue;
      }
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, contents);
    }
  }

  #relative(file: string) {
    return path.relative(this.#top, realFile(file)).split(path.sep).join("/");
  }
}

/** Resolves symlinks as git does; works for files that no longer exist. */
export function realFile(file: string) {
  try {
    return path.join(realpathSync.native(path.dirname(file)), path.basename(file));
  } catch {
    return path.resolve(file);
  }
}

async function git(cwd: string, args: string[], env?: NodeJS.ProcessEnv) {
  const { stdout } = await run("git", args, { cwd, env, maxBuffer: MAX_BUFFER, encoding: "utf8" });
  return stdout;
}
