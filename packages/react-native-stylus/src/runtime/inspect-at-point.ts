import type { HostInstance } from "react-native";
import type { Rect } from "../shared/protocol";

type MeasureCallback = (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void;

type HierarchyItem = {
  name: string;
  getInspectorData: () => { measure: (callback: MeasureCallback) => void };
};

type Fiber = {
  _debugOwner?: Fiber | null;
  _debugStack?: Error | null;
};

type InspectorData = {
  hierarchy: HierarchyItem[];
  selectedIndex: number | null;
  closestInstance?: Fiber;
};

type DevToolsRenderer = {
  rendererConfig?: {
    getInspectorDataForViewAtPoint?: (
      view: HostInstance,
      x: number,
      y: number,
      callback: (data: InspectorData) => void,
    ) => void;
  };
};

declare const globalThis: {
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: { renderers: Map<number, DevToolsRenderer> };
};

export type InspectedComponent = {
  name: string;
  /** Captured by React where this component's element was created. */
  debugStack: string | null;
  /** Bounds in window coordinates. */
  measure: () => Promise<Rect>;
};

/**
 * Finds the components that rendered the element under a point, innermost first. Uses the
 * same renderer hook as React Native's element inspector.
 */
export function inspectAtPoint(view: HostInstance, x: number, y: number): Promise<InspectedComponent[]> {
  const renderers = [...(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers.values() ?? [])].flatMap((renderer) => {
    const inspect = renderer.rendererConfig?.getInspectorDataForViewAtPoint;
    return inspect ? [inspect] : [];
  });

  return new Promise((resolve) => {
    let pending = renderers.length;
    if (pending === 0) return resolve([]);

    for (const inspect of renderers) {
      inspect(view, x, y, (data) => {
        pending -= 1;
        const components = componentsFrom(data);
        if (components.length > 0 || pending === 0) resolve(components);
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

function measure(item: HierarchyItem): Promise<Rect> {
  return new Promise((resolve) => {
    item
      .getInspectorData()
      .measure((_x, _y, width, height, pageX, pageY) => resolve({ x: pageX, y: pageY, width, height }));
  });
}
