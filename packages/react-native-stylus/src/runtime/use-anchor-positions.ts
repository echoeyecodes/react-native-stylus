import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Animated, useWindowDimensions, type HostInstance } from "react-native";
import type { Rect } from "../shared/protocol";
import type { InspectedComponent } from "./inspect-at-point";
import { locateAnchor } from "./locate-anchor";
import type { Thread } from "./threads";

export const BUBBLE_SIZE = 30;
/** Keeps bubbles this far from the screen's edges. */
const EDGE = 8;
/** Retry interval for finding elements that went missing. */
const LOCATE_EVERY_MS = 1500;

type Tracked = {
  component: InspectedComponent | null;
  /** Last seen, in overlay coordinates. */
  frame: Rect | null;
  measuring: boolean;
};

type Window = { width: number; height: number };

export type AnchorPositions = {
  /** Bubble centre, moved every frame without re-rendering. */
  position: (threadId: string) => Animated.ValueXY;
  /** Threads whose element is on screen right now. */
  visible: ReadonlySet<string>;
  /** Follows the element a thread was created from, skipping the lookup. */
  track: (threadId: string, component: InspectedComponent) => void;
  frameOf: (threadId: string) => Rect | null;
};

type Options = {
  threads: Thread[];
  view: RefObject<HostInstance | null>;
  origin: string | null;
  /** Converts window coordinates, which measuring returns, into the overlay's. */
  toLocal: (rect: Rect) => Rect;
};

/** An element that unmounts is looked up again by name and source location until it returns. */
export function useAnchorPositions({ threads, view, origin, toLocal }: Options): AnchorPositions {
  const window = useWindowDimensions();
  const tracked = useRef(new Map<string, Tracked>());
  const positions = useRef(new Map<string, Animated.ValueXY>());
  const [visible, setVisible] = useState<ReadonlySet<string>>(new Set());
  const anchored = threads.filter((thread) => thread.anchor);

  // The frame loop and the lookups outlive renders, so they read the latest values from here.
  const latest = useRef({ anchored, window, origin, toLocal });
  useEffect(() => {
    latest.current = { anchored, window, origin, toLocal };
  });

  const position = useCallback((threadId: string) => {
    let value = positions.current.get(threadId);
    if (!value) {
      value = new Animated.ValueXY({ x: -BUBBLE_SIZE, y: -BUBBLE_SIZE });
      positions.current.set(threadId, value);
    }
    return value;
  }, []);

  const entry = (threadId: string) => {
    let value = tracked.current.get(threadId);
    if (!value) {
      value = { component: null, frame: null, measuring: false };
      tracked.current.set(threadId, value);
    }
    return value;
  };

  const show = useCallback((threadId: string, shown: boolean) => {
    setVisible((current) => {
      if (current.has(threadId) === shown) return current;
      const next = new Set(current);
      if (shown) next.add(threadId);
      else next.delete(threadId);
      return next;
    });
  }, []);

  const track = useCallback((threadId: string, component: InspectedComponent) => {
    entry(threadId).component = component;
  }, []);

  const hasAnchors = anchored.length > 0;

  useEffect(() => {
    if (!hasAnchors) return;
    let frameId = 0;

    const tick = () => {
      const { anchored, window, toLocal } = latest.current;
      for (const thread of anchored) {
        const item = entry(thread.id);
        const component = item.component;
        if (!component || item.measuring) continue;
        item.measuring = true;
        void component.measure().then((rect) => {
          item.measuring = false;
          if (item.component !== component) return;
          if (!rect || (rect.width === 0 && rect.height === 0)) {
            item.component = null;
            return show(thread.id, false);
          }
          const frame = toLocal(rect);
          item.frame = frame;
          position(thread.id).setValue(pinPoint(frame, window));
          show(thread.id, isOnScreen(frame, window));
        });
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [hasAnchors, position, show]);

  useEffect(() => {
    if (!hasAnchors) return;
    let cancelled = false;
    let locating = false;

    const locateMissing = async () => {
      const { anchored, origin } = latest.current;
      const app = view.current;
      if (locating || !origin || !app) return;
      locating = true;
      for (const thread of anchored) {
        const item = entry(thread.id);
        if (item.component || !thread.anchor) continue;
        const found = await locateAnchor(origin, app, thread.anchor, item.frame ?? thread.anchor.frame).catch(
          () => null,
        );
        if (cancelled) break;
        if (found && !item.component) item.component = found;
      }
      locating = false;
    };

    void locateMissing();
    const timer = setInterval(() => void locateMissing(), LOCATE_EVERY_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hasAnchors, view]);

  const ids = threads.map((thread) => thread.id).join(" ");
  useEffect(() => {
    const live = new Set(ids.split(" "));
    for (const id of [...tracked.current.keys()]) if (!live.has(id)) tracked.current.delete(id);
    for (const id of [...positions.current.keys()]) if (!live.has(id)) positions.current.delete(id);
  }, [ids]);

  const frameOf = useCallback((threadId: string) => tracked.current.get(threadId)?.frame ?? null, []);

  return { position, visible, track, frameOf };
}

/** The element's top right corner, kept inside the screen. */
function pinPoint(frame: Rect, window: Window) {
  const half = BUBBLE_SIZE / 2;
  return {
    x: Math.min(frame.x + frame.width - 4, window.width - EDGE - half),
    y: Math.max(frame.y + 4, half),
  };
}

function isOnScreen(frame: Rect, window: Window) {
  return frame.y + frame.height > 0 && frame.y < window.height && frame.x + frame.width > 0 && frame.x < window.width;
}
