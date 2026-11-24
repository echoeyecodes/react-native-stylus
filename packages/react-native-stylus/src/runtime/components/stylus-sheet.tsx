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

/** Max share of the screen the half height takes. */
const HALF = 0.55;
/** Minimum conversation height at the half height, in points. */
const MIN_BODY = 160;
/** Points below the half height that dismiss the sheet. */
const DISMISS_DISTANCE = 80;
const TOP_GAP = 8;
/** Drag velocity is projected this far ahead to pick the resting height. */
const FLICK_MS = 150;
/** Within this many points of the end, new output keeps the view at the bottom. */
const STICK_DISTANCE = 48;

type Props = {
  detent: Detent;
  onDetentChange: (detent: Detent) => void;
  /** Called when dragged down past the half height. */
  onDismiss: () => void;
  /** Slides the sheet off screen. */
  hidden: boolean;
  /** Called once the slide off screen finishes. */
  onHidden?: () => void;
  children: ReactNode;
};

/** Rests at half or nearly full height; the header drags it between them or away. */
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
  /** Pulses the subtitle. */
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
  /** Scrolls to the newest output whenever this changes. */
  followKey?: unknown;
  children: ReactNode;
};

/** Follows new output until dragged away from the end; follows again on drag back or send. */
export function SheetBody({ followKey, children }: SheetBodyProps) {
  const styles = useStyles();
  const { onContentHeight } = useSheet();
  const scroll = useRef<ScrollViewInstance>(null);
  const following = useRef(true);
  // Only the developer's own drags decide following; programmatic scrolls would end mid-animation.
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
