import type { HostInstance } from "react-native";
import type { Anchor, Rect, SourceLocation } from "../shared/protocol";
import { componentsNamed, type InspectedComponent } from "./inspect-at-point";
import { projectLocations } from "./source-locations";

/** Debug stacks only change when the code that created an element changes, so their locations are kept. */
const locations = new Map<string, SourceLocation | null>();

/**
 * Finds the element a thread is pinned to after it has been mounted again, such as after Fast
 * Refresh or a reload: the component with the same name created in the same file, nearest the
 * line it was picked at, since edits move lines. Among several, such as rows of a list, the one
 * nearest to where the element was last seen wins.
 */
export async function locateAnchor(
  origin: string,
  view: HostInstance,
  anchor: Anchor,
  lastSeen: Rect,
): Promise<InspectedComponent | null> {
  const picked = anchor.components[anchor.selected];
  if (!picked) return null;

  const candidates = await componentsNamed(view, picked.name);
  const resolved = await locationsOf(
    origin,
    candidates.map((candidate) => candidate.debugStack),
  );
  const inFile = candidates.flatMap((candidate, index) => {
    const location = resolved[index];
    return location?.file === picked.location.file
      ? [{ candidate, lineDistance: Math.abs(location.line - picked.location.line) }]
      : [];
  });
  if (inFile.length === 0) return null;

  const nearestLine = Math.min(...inFile.map(({ lineDistance }) => lineDistance));
  const onThatLine = inFile
    .filter(({ lineDistance }) => lineDistance === nearestLine)
    .map(({ candidate }) => candidate);
  if (onThatLine.length === 1) return onThatLine[0]!;

  const frames = await Promise.all(onThatLine.map((candidate) => candidate.measure()));
  let best: InspectedComponent | null = null;
  let bestDistance = Infinity;
  frames.forEach((frame, index) => {
    if (!frame) return;
    const distance = Math.hypot(frame.x - lastSeen.x, frame.y - lastSeen.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = onThatLine[index]!;
    }
  });
  return best;
}

async function locationsOf(origin: string, stacks: (string | null)[]): Promise<(SourceLocation | null)[]> {
  const unknown = [...new Set(stacks.filter((stack): stack is string => stack !== null && !locations.has(stack)))];
  if (unknown.length > 0) {
    const found = await projectLocations(origin, unknown);
    unknown.forEach((stack, index) => locations.set(stack, found[index] ?? null));
  }
  return stacks.map((stack) => (stack === null ? null : (locations.get(stack) ?? null)));
}
