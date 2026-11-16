import type { Part, TextPart } from "./turns";

export type Segment =
  | { kind: "activity"; key: string; parts: Exclude<Part, TextPart>[] }
  | { kind: "text"; key: string; part: TextPart };

/** Groups consecutive steps into one list, keeping Claude's words between them. */
export function segmentParts(parts: Part[]): Segment[] {
  const segments: Segment[] = [];
  for (const part of parts) {
    if (part.kind === "text") {
      if (part.text.trim()) segments.push({ kind: "text", key: part.id, part });
      continue;
    }
    const last = segments.at(-1);
    if (last?.kind === "activity") last.parts.push(part);
    else segments.push({ kind: "activity", key: part.id, parts: [part] });
  }
  return segments;
}
