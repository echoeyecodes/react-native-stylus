import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderHandlers,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { motion, themedStyles } from "../theme";
import { useKeyboard } from "../use-keyboard";
import { PulsingText } from "./pulsing-text";

export type Detent = "half" | "full";

type SheetContextValue = {
  panHandlers: GestureResponderHandlers;
  onHeaderLayout: (event: LayoutChangeEvent) => void;
  onFooterLayout: (event: LayoutChangeEvent) => void;
  onContentHeight: (height: number) => void;
  footerInset: number;
};

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheet() {
  const value = use(SheetContext);
  if (!value) throw new Error("Sheet parts must be used inside StylusSheet");
  return value;
}

/** The half height fits the conversation, up to this share of the screen. */
const HALF = 0.55;
/** The least room the half height leaves for the conversation. */
const MIN_BODY = 160;
/** Dragged this far below the half height, the sheet goes away. */
const DISMISS_DISTANCE = 80;
const TOP_GAP = 8;
/** A flick this fast carries the sheet past the height it was dragged nearest to. */
const FLICK_MS = 150;
/** Within this distance of the end, new output keeps the conversation scrolled to the bottom. */
const STICK_DISTANCE = 48;

type Props = {
  detent: Detent;
  onDetentChange: (detent: Detent) => void;
  /** Called when the sheet is dragged down past its half height. */
  onDismiss: () => void;
  /** Slides the sheet off screen. */
  hidden: boolean;
  /** Called once the sheet has finished sliding off screen. */
  onHidden?: () => void;
  children: ReactNode;
};

/**
 * A bottom sheet that rests at two heights: the conversation up to about half the screen, or
 * nearly all of it. Its header drags it between them or down and away, and it rides above the
 * keyboard.
 */
export function StylusSheet({ detent, onDetentChange, onDismiss, hidden, onHidden, children }: Props) {
  const styles = useStyles();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboard();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const compact = headerHeight + footerHeight;
  const tallest = Math.max(compact, window.height - keyboard.height - insets.top - TOP_GAP);
  const heights: Record<Detent, number> = {
    half: Math.min(Math.max(compact + MIN_BODY, Math.min(window.height * HALF, compact + contentHeight)), tallest),
    full: tallest,
  };
  const target = heights[detent];
  const measured = headerHeight > 0 && footerHeight > 0;

  const height = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(1)).current;
  const current = useRef(0);
  const dragStart = useRef(0);

  useEffect(() => {
    const id = height.addListener(({ value }) => (current.current = value));
    return () => height.removeListener(id);
  }, [height]);

  useEffect(() => {
    if (!measured) return;
    if (current.current === 0) {
      height.setValue(target);
      return;
    }
    Animated.timing(height, { toValue: target, duration: 320, easing: motion.easeOut, useNativeDriver: false }).start();
  }, [height, measured, target]);

  useEffect(() => {
    Animated.timing(lift, {
      toValue: keyboard.height,
      duration: keyboard.duration,
      easing: motion.easeOut,
      useNativeDriver: false,
    }).start();
  }, [lift, keyboard]);

  // The responder and the slide's completion outlive renders, so they read the latest props from here.
  const latest = useRef({ compact, heights, detent, onDetentChange, onDismiss, onHidden });
  useEffect(() => {
    latest.current = { compact, heights, detent, onDetentChange, onDismiss, onHidden };
  });

  useEffect(() => {
    Animated.timing(slide, {
      toValue: hidden ? 1 : 0,
      duration: hidden ? 260 : 340,
      easing: motion.easeOut,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && hidden) latest.current.onHidden?.();
    });
  }, [slide, hidden]);

  const settle = (projected: number) => {
    const { heights, detent, onDetentChange, onDismiss } = latest.current;
    if (projected < heights.half - DISMISS_DISTANCE) return onDismiss();
    const next = Math.abs(heights.full - projected) < Math.abs(heights.half - projected) ? "full" : "half";
    if (next !== detent) return onDetentChange(next);
    Animated.timing(height, {
      toValue: heights[next],
      duration: 260,
      easing: motion.easeOut,
      useNativeDriver: false,
    }).start();
  };

  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, { dx, dy }) => Math.abs(dy) > 4 && Math.abs(dy) > Math.abs(dx),
      onPanResponderGrant: () => {
        height.stopAnimation();
        dragStart.current = current.current;
      },
      onPanResponderMove: (_event, { dy }) => {
        const { compact, heights } = latest.current;
        height.setValue(Math.min(Math.max(dragStart.current - dy, compact), heights.full));
      },
      onPanResponderRelease: (_event, { dy, vy }) => settle(dragStart.current - dy - vy * FLICK_MS),
      // The system takes over drags that reach the bottom edge, so a taken-over drag settles too.
      onPanResponderTerminate: (_event, { dy, vy }) => settle(dragStart.current - dy - vy * FLICK_MS),
    }),
  );

  const context: SheetContextValue = {
    panHandlers: pan.panHandlers,
    onHeaderLayout: (event) => setHeaderHeight(event.nativeEvent.layout.height),
    onFooterLayout: (event) => setFooterHeight(event.nativeEvent.layout.height),
    onContentHeight: setContentHeight,
    footerInset: keyboard.height > 0 ? 10 : Math.max(insets.bottom, 10),
  };

  return (
    <SheetContext value={context}>
      <Animated.View
        pointerEvents={hidden ? "none" : "box-none"}
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, window.height] }) }] },
        ]}
      >
        <Animated.View style={[styles.sheet, { bottom: lift, height: measured ? height : undefined }]}>
          {children}
        </Animated.View>
      </Animated.View>
    </SheetContext>
  );
}

export function SheetHeader({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const { panHandlers, onHeaderLayout } = useSheet();
  return (
    <View {...panHandlers} onLayout={onHeaderLayout} style={styles.header}>
      <View style={styles.handle} />
      <View style={styles.headerRow}>{children}</View>
    </View>
  );
}

type SheetTitleProps = {
  title: string;
  subtitle: string;
  /** Pulses the subtitle while work is in progress. */
  busy: boolean;
};

export function SheetTitle({ title, subtitle, busy }: SheetTitleProps) {
  const styles = useStyles();
  return (
    <View style={styles.titleBlock}>
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      {busy ? (
        <PulsingText numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </PulsingText>
      ) : (
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

type SheetBodyProps = {
  /** Scrolls to the newest output whenever this changes, such as when a message is sent. */
  followKey?: unknown;
  children: ReactNode;
};

/**
 * The scrolling conversation. It follows new output until the developer drags it away from the end,
 * and follows again once they drag back down or send something.
 */
export function SheetBody({ followKey, children }: SheetBodyProps) {
  const styles = useStyles();
  const { onContentHeight } = useSheet();
  const scroll = useRef<ScrollViewInstance>(null);
  const following = useRef(true);
  // Only the developer's own scrolling decides whether to follow; scrolls Stylus starts would end mid-animation.
  const dragged = useRef(false);

  useEffect(() => {
    following.current = true;
    scroll.current?.scrollToEnd({ animated: true });
  }, [followKey]);

  const settle = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!dragged.current) return;
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    following.current = contentSize.height - contentOffset.y - layoutMeasurement.height < STICK_DISTANCE;
  };

  return (
    <ScrollView
      ref={scroll}
      style={styles.body}
      onScrollBeginDrag={() => {
        dragged.current = true;
        following.current = false;
      }}
      onScrollEndDrag={settle}
      onMomentumScrollEnd={(event) => {
        settle(event);
        dragged.current = false;
      }}
      onContentSizeChange={(_width, height) => {
        onContentHeight(height);
        if (following.current) scroll.current?.scrollToEnd({ animated: true });
      }}
      onLayout={() => {
        if (following.current) scroll.current?.scrollToEnd({ animated: false });
      }}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.bodyContent}
    >
      {children}
    </ScrollView>
  );
}

export function SheetFooter({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const { onFooterLayout, footerInset } = useSheet();
  return (
    <View onLayout={onFooterLayout} style={[styles.footer, { paddingBottom: footerInset }]}>
      {children}
    </View>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    sheet: {
      position: "absolute",
      left: 0,
      right: 0,
      overflow: "hidden",
      backgroundColor: palette.sheet,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderCurve: "continuous",
      borderWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: 0,
      borderColor: palette.sheetBorder,
      boxShadow: palette.sheetShadow,
    },
    header: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 10 },
    handle: { alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: palette.handle },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
    titleBlock: { flex: 1, gap: 1 },
    title: { color: palette.text, fontSize: 17, fontWeight: "600", letterSpacing: -0.2 },
    subtitle: { color: palette.tertiary, fontSize: 13 },
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 28 },
    footer: { paddingHorizontal: 12, paddingTop: 6 },
  }),
);
