import type { SourceLocation, TurnComponent } from "../shared/protocol";
import { LIBRARY, parseStackFrames, REACT_RUNTIME, symbolicate, type StackFrame } from "./stack-frames";

/** Null for elements created inside libraries. */
export async function projectLocations(origin: string, stacks: (string | null)[]): Promise<(SourceLocation | null)[]> {
  const perStack = stacks.map((stack) => (stack ? creationFrames(stack) : []));
  const symbolicated = await symbolicate(origin, perStack.flat());

  let offset = 0;
  return perStack.map(({ length }) => {
    const resolved = symbolicated.slice(offset, offset + length);
    offset += length;
    const creation = resolved.find((frame) => frame.file && !REACT_RUNTIME.test(frame.file));
    if (!creation?.file || creation.lineNumber == null || LIBRARY.test(creation.file)) return null;
    return { file: creation.file, line: creation.lineNumber };
  });
}

/** The project code an error passed through, innermost first. */
export async function errorLocations(origin: string, stack: string, limit = 6): Promise<TurnComponent[]> {
  const frames = parseStackFrames(stack);
  const symbolicated = await symbolicate(origin, frames);
  const seen = new Set<string>();
  const components: TurnComponent[] = [];

  symbolicated.forEach((frame, index) => {
    if (!frame.file || frame.lineNumber == null || LIBRARY.test(frame.file)) return;
    const key = `${frame.file}:${frame.lineNumber}`;
    if (seen.has(key) || components.length >= limit) return;
    seen.add(key);
    const name = frames[index]?.methodName || frame.methodName || "anonymous";
    components.push({ name, location: { file: frame.file, line: frame.lineNumber } });
  });
  return components;
}

/** The frames between React's marker frames: its JSX runtime, then the code that created the element. */
function creationFrames(stack: string): StackFrame[] {
  const lines = stack.split("\n");
  const bottom = lines.findIndex((line) => /react[_-]stack[_-]bottom[_-]frame/.test(line));
  return parseStackFrames((bottom === -1 ? lines : lines.slice(0, bottom)).join("\n"));
}
