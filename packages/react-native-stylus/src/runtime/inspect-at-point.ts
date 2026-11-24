import type { HostInstance } from "react-native";
import type { Rect } from "../shared/protocol";

type MeasureCallback = (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void;

type HierarchyItem = {
  name: string;
  getInspectorData: () => { measure: (callback: MeasureCallback) => void };
};

type Fiber = {
  tag: number;
  type: unknown;
  child: Fiber | null;
  sibling: Fiber | null;
  return: Fiber | null;
  stateNode: unknown;
  _debugOwner?: Fiber | null;
  _debugStack?: Error | null;
};

type InspectorData = {
  hierarchy: HierarchyItem[];
  selectedIndex: number | null;
  closestInstance?: Fiber;
};

type RendererConfig = {
  getInspectorDataForViewAtPoint?: (
    view: HostInstance,
    x: number,
    y: number,
    callback: (data: InspectorData) => void,
  ) => void;
  getInspectorDataForInstance?: (fiber: Fiber) => InspectorData;
};

declare const globalThis: {
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: { renderers: Map<number, { rendererConfig?: RendererConfig }> };
};

/** React's tag for the fiber at the top of a tree. */
const HOST_ROOT = 3;
/** A measure that hasn't answered by now never will, because the element has no view any more. */
const MEASURE_TIMEOUT_MS = 300;

export type InspectedComponent = {
  name: string;
  /** Captured by React where this component's element was created. */
  debugStack: string | null;
  /** Bounds in window coordinates, or null once the component is no longer on screen. */
  measure: () => Promise<Rect | null>;
};

/**
 * Finds the components that rendered the element under a point, innermost first. Uses the
 * same renderer hook as React Native's element inspector.
 */
export async function inspectAtPoint(view: HostInstance, x: number, y: number): Promise<InspectedComponent[]> {
  const data = await inspectorDataAt(view, x, y);
  return data ? componentsFrom(data) : [];
}

/**
 * Every mounted component named `name` in the tree `view` belongs to, found by walking React's
 * current tree from its root.
 */
export async function componentsNamed(view: HostInstance, name: string): Promise<InspectedComponent[]> {
  const config = rendererConfigs().find((candidate) => candidate.getInspectorDataForInstance);
  const inspect = config?.getInspectorDataForInstance;
  const root = currentRoot((await inspectorDataAt(view, 1, 1))?.closestInstance ?? null);
  if (!inspect || !root) return [];

  const found: InspectedComponent[] = [];
  const pending: Fiber[] = [root];
  while (pending.length > 0) {
    const fiber = pending.pop()!;
    if (fiber.child) pending.push(fiber.child);
    if (fiber.sibling) pending.push(fiber.sibling);
    if (!fiber._debugStack || !mightBeNamed(fiber.type, name)) continue;

    const item = inspect(fiber).hierarchy.at(-1);
    if (item?.name !== name) continue;
    found.push({ name, debugStack: fiber._debugStack.stack ?? null, measure: () => measure(item) });
  }
  return found;
}

function rendererConfigs(): RendererConfig[] {
  return [...(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers.values() ?? [])].flatMap((renderer) =>
    renderer.rendererConfig ? [renderer.rendererConfig] : [],
  );
}

function inspectorDataAt(view: HostInstance, x: number, y: number): Promise<InspectorData | null> {
  const inspectors = rendererConfigs().flatMap((config) =>
    config.getInspectorDataForViewAtPoint ? [config.getInspectorDataForViewAtPoint] : [],
  );

  return new Promise((resolve) => {
    let pending = inspectors.length;
    if (pending === 0) return resolve(null);

    for (const inspect of inspectors) {
      inspect(view, x, y, (data) => {
        pending -= 1;
        if (data.hierarchy.length > 0 || pending === 0) resolve(data);
      });
    }
  });
}

/** The hierarchy runs from the root to the touched view; the owner chain walks it backwards. */
function componentsFrom({ hierarchy, selectedIndex, closestInstance }: InspectorData): InspectedComponent[] {
  const components: InspectedComponent[] = [];
  let fiber = closestInstance ?? null;
  for (let index = selectedIndex ?? -1; index >= 0 && fiber; index -= 1) {
    const item = hierarchy[index];
    if (!item) break;
    components.push({
      name: item.name,
      debugStack: fiber._debugStack?.stack ?? null,
      measure: () => measure(item),
    });
    fiber = fiber._debugOwner ?? null;
  }
  return components;
}

/** Any fiber's root holds the tree that is on screen now, rather than one React is preparing. */
function currentRoot(fiber: Fiber | null): Fiber | null {
  let node = fiber;
  while (node?.return) node = node.return;
  if (node?.tag !== HOST_ROOT) return null;
  return (node.stateNode as { current: Fiber }).current;
}

/** A cheap first pass over a fiber's type; the inspector's own name settles it. */
function mightBeNamed(type: unknown, name: string): boolean {
  if (typeof type === "function")
    return name.includes((type as { displayName?: string; name: string }).displayName ?? type.name);
  if (!type || typeof type !== "object") return false;
  const wrapper = type as { displayName?: string; render?: unknown; type?: unknown };
  if (wrapper.displayName) return name.includes(wrapper.displayName);
  return mightBeNamed(wrapper.render, name) || mightBeNamed(wrapper.type, name);
}

function measure(item: HierarchyItem): Promise<Rect | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), MEASURE_TIMEOUT_MS);
    try {
      item.getInspectorData().measure((_x, _y, width, height, pageX, pageY) => {
        clearTimeout(timer);
        resolve({ x: pageX, y: pageY, width, height });
      });
    } catch {
      // React throws when asked to find the view of a component that has unmounted.
      clearTimeout(timer);
      resolve(null);
    }
  });
}
