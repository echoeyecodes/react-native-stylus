import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, PanResponder, StyleSheet } from "react-native";
import type { Thread } from "../threads";
import { motion, themedStyles, usePalette, type Palette } from "../theme";
import { BUBBLE_SIZE } from "../use-anchor-positions";
import { Icon } from "./icon";

/** Held this long, a bubble lifts so it can be dragged onto the remove target. */
const LONG_PRESS_MS = 350;
/** A touch that moves further than this before the long press is a scroll, not a tap. */
const TAP_SLOP = 10;

type Point = { x: number; y: number };

type Props = {
  thread: Thread;
  position: Animated.ValueXY;
  visible: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragMove: (point: Point) => void;
  /** Returns whether the bubble was dropped on the remove target. */
  onDrop: (point: Point) => boolean;
};

type Look = "queued" | "working" | "done" | "problem" | "idle";

export function ThreadBubble({ thread, position, visible, onOpen, onDragStart, onDragMove, onDrop }: Props) {
  const styles = useStyles();
  const palette = usePalette();
  const look = lookOf(thread);
  const enter = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(1)).current;
  const drag = useRef(new Animated.ValueXY()).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, bounciness: 8, speed: 14, useNativeDriver: false }).start();
  }, [enter]);

  // The responder outlives renders, so it reads the latest callbacks from here.
  const callbacks = useRef({ onOpen, onDragStart, onDragMove, onDrop });
  useEffect(() => {
    callbacks.current = { onOpen, onDragStart, onDragMove, onDrop };
  });

  const [pan] = useState(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let dragging = false;
    let moved = false;

    const scaleTo = (toValue: number) =>
      Animated.spring(lift, { toValue, bounciness: 6, speed: 20, useNativeDriver: false }).start();
    const settle = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      dragging = false;
      scaleTo(1);
      Animated.spring(drag, { toValue: { x: 0, y: 0 }, bounciness: 4, speed: 16, useNativeDriver: false }).start();
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => !dragging,
      onPanResponderGrant: () => {
        moved = false;
        scaleTo(0.9);
        timer = setTimeout(() => {
          timer = null;
          dragging = true;
          scaleTo(1.2);
          callbacks.current.onDragStart();
        }, LONG_PRESS_MS);
      },
      onPanResponderMove: (_event, { dx, dy, moveX, moveY }) => {
        if (dragging) {
          drag.setValue({ x: dx, y: dy });
          return callbacks.current.onDragMove({ x: moveX, y: moveY });
        }
        if (!moved && Math.hypot(dx, dy) > TAP_SLOP) {
          moved = true;
          if (timer) clearTimeout(timer);
          timer = null;
          scaleTo(1);
        }
      },
      onPanResponderRelease: (_event, { moveX, moveY, x0, y0 }) => {
        if (dragging) {
          const point = moveX === 0 && moveY === 0 ? { x: x0, y: y0 } : { x: moveX, y: moveY };
          if (callbacks.current.onDrop(point)) {
            if (timer) clearTimeout(timer);
            Animated.parallel([
              Animated.timing(lift, { toValue: 0.4, duration: 180, easing: motion.easeOut, useNativeDriver: false }),
              Animated.timing(fade, { toValue: 0, duration: 180, easing: motion.easeOut, useNativeDriver: false }),
            ]).start();
            return;
          }
          return settle();
        }
        const tapped = timer !== null && !moved;
        settle();
        if (tapped) callbacks.current.onOpen();
      },
      onPanResponderTerminate: settle,
    });
  });

  const half = BUBBLE_SIZE / 2;
  return (
    <Animated.View
      {...pan.panHandlers}
      accessibilityRole="button"
      accessibilityLabel={`Conversation, ${LABELS[look]}`}
      accessibilityHint="Opens the conversation. Hold to drag it away."
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.bubble,
        bubbleColors(palette, look),
        {
          opacity: visible ? Animated.multiply(enter, fade) : 0,
          transform: [
            { translateX: Animated.add(position.x, drag.x) },
            { translateY: Animated.add(position.y, drag.y) },
            { translateX: -half },
            { translateY: -half },
            { scale: Animated.multiply(enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }), lift) },
          ],
        },
      ]}
    >
      {look === "working" ? (
        <ActivityIndicator size="small" color={palette.accent} style={styles.spinner} />
      ) : (
        <Icon name="message" color={iconColor(palette, look)} size={15} />
      )}
    </Animated.View>
  );
}

const LABELS: Record<Look, string> = {
  queued: "waiting its turn",
  working: "working",
  done: "done",
  problem: "something went wrong",
  idle: "nothing changed",
};

function lookOf(thread: Thread): Look {
  switch (thread.turns.at(-1)?.status) {
    case "queued":
      return "queued";
    case "running":
    case "checking":
      return "working";
    case "done":
      return "done";
    case "broken":
    case "failed":
      return "problem";
    default:
      return "idle";
  }
}

function bubbleColors(palette: Palette, look: Look) {
  if (look === "done") return { backgroundColor: palette.accent, borderColor: palette.accent };
  if (look === "problem") return { backgroundColor: palette.danger, borderColor: palette.danger };
  return { backgroundColor: palette.sheet, borderColor: palette.sheetBorder };
}

function iconColor(palette: Palette, look: Look) {
  if (look === "done" || look === "problem") return palette.onAccent;
  if (look === "queued") return palette.tertiary;
  return palette.secondary;
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    bubble: {
      position: "absolute",
      left: 0,
      top: 0,
      width: BUBBLE_SIZE,
      height: BUBBLE_SIZE,
      borderRadius: BUBBLE_SIZE / 2,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: palette.floatingShadow,
    },
    spinner: { transform: [{ scale: 0.8 }] },
  }),
);
