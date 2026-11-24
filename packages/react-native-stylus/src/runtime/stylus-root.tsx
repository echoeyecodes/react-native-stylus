import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet, View, type HostInstance } from "react-native";
import { AppErrorBoundary } from "./components/app-error-boundary";
import { CrashScreen } from "./components/crash-screen";
import { StylusOverlay } from "./components/stylus-overlay";
import { registerOpener, unregisterOpener } from "./stylus-opener";
import { useStylus } from "./use-stylus";
import { useTwoFingerHold } from "./use-two-finger-hold";

export function StylusRoot({ children }: { children: ReactNode }) {
  const rootRef = useRef<HostInstance>(null);
  const appRef = useRef<HostInstance>(null);
  const stylus = useStylus(rootRef, appRef);
  const { mode, threads } = stylus.state;
  const fixing = threads.list.some((thread) =>
    thread.turns.some((turn) => turn.origin === "repair" && ["queued", "running", "checking"].includes(turn.status)),
  );
  const hold = useTwoFingerHold(stylus.start, mode !== "picking");
  const { health } = stylus;
  const appShift = useRef(new Animated.Value(0)).current;
  const [appTransform] = useState(() => [{ translateY: Animated.multiply(appShift, -1) }]);

  useEffect(() => {
    registerOpener(stylus.start);
    return () => unregisterOpener(stylus.start);
  }, [stylus.start]);

  // Errors outside rendering never reach the boundary, so they are noted here first.
  useEffect(() => {
    const previous = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      health.failed(error);
      previous(error, isFatal);
    });
    return () => ErrorUtils.setGlobalHandler(previous);
  }, [health]);

  return (
    <View ref={rootRef} style={styles.fill} {...hold}>
      {/* Outside the captured view, so screenshots show the app unshifted. */}
      <Animated.View style={[styles.fill, { transform: appTransform }]}>
        <View ref={appRef} style={styles.fill} collapsable={false}>
          <AppErrorBoundary
            health={health}
            fallback={(error) => <CrashScreen error={error} onFix={fixing ? null : () => void stylus.fixCrash()} />}
          >
            {children}
          </AppErrorBoundary>
        </View>
      </Animated.View>
      {(mode !== "idle" || threads.list.length > 0) && <StylusOverlay stylus={stylus} appShift={appShift} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
