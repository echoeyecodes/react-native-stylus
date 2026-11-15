import { useEffect, useRef } from "react";
import type { GestureResponderEvent, ViewProps } from "react-native";

const HOLD_MS = 500;
/** Fingers resting on glass drift a little; more than this is a pinch or a scroll. */
const SLOP = 12;

type TouchHandlers = Pick<ViewProps, "onTouchStart" | "onTouchMove" | "onTouchEnd" | "onTouchCancel">;

/**
 * Calls `onHold` when two fingers rest on the screen. Uses touch events, which reach every
 * ancestor without claiming the responder, so the app keeps handling the same touches.
 */
export function useTwoFingerHold(onHold: () => void, enabled: boolean): TouchHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origins = useRef(new Map<number, { x: number; y: number }>());

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origins.current.clear();
  };

  useEffect(() => cancel, []);

  if (!enabled) return {};

  return {
    onTouchStart(event: GestureResponderEvent) {
      const { touches } = event.nativeEvent;
      cancel();
      if (touches.length !== 2) return;
      for (const touch of touches) origins.current.set(touch.identifier, { x: touch.pageX, y: touch.pageY });
      timer.current = setTimeout(() => {
        cancel();
        onHold();
      }, HOLD_MS);
    },
    onTouchMove(event: GestureResponderEvent) {
      if (!timer.current) return;
      for (const touch of event.nativeEvent.touches) {
        const origin = origins.current.get(touch.identifier);
        if (!origin || Math.hypot(touch.pageX - origin.x, touch.pageY - origin.y) > SLOP) return cancel();
      }
    },
    onTouchEnd: cancel,
    onTouchCancel: cancel,
  };
}
