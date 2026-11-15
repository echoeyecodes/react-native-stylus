export type StackFrame = { methodName: string; file: string; lineNumber: number; column: number };

const FRAME = /^\s*at (?:(.*?) \()?(.+):(\d+):(\d+)\)?$/;

export const REACT_RUNTIME = /[\\/]node_modules[\\/]react[\\/]/;
export const LIBRARY = /[\\/]node_modules[\\/]/;

/** Reads `at name (file:line:column)` lines, the format Hermes and React both use. */
export function parseStackFrames(stack: string): StackFrame[] {
  const frames: StackFrame[] = [];
  for (const line of stack.split("\n")) {
    const match = FRAME.exec(line);
    if (!match?.[2]) continue;
    frames.push({ methodName: match[1] ?? "", file: match[2], lineNumber: Number(match[3]), column: Number(match[4]) });
  }
  return frames;
}

/** Maps bundle positions back to source files through Metro, as LogBox does. */
export async function symbolicate(origin: string, frames: StackFrame[]): Promise<Partial<StackFrame>[]> {
  if (frames.length === 0) return [];
  const response = await fetch(`${origin}/symbolicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stack: frames }),
  });
  if (!response.ok) throw new Error(`Metro couldn't map this to your code (${response.status}).`);
  return ((await response.json()) as { stack: Partial<StackFrame>[] }).stack;
}
