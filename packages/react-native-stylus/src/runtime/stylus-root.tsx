import { useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View, type HostInstance } from "react-native";
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
  const { mode, turns } = stylus.state;
  const latest = turns.at(-1);
  const busy = latest?.status === "running" || latest?.status === "checking";
  const hold = useTwoFingerHold(stylus.start, mode !== "picking");
  const { health } = stylus;

  useEffect(() => {
    registerOpener(stylus.start);
    return () => unregisterOpener(stylus.start);
  }, [stylus.start]);

  // Errors outside rendering never reach the boundary, so they are noted here before React Native handles them.
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
      <View ref={appRef} style={styles.fill} collapsable={false}>
        <AppErrorBoundary
          health={health}
          fallback={(error) => <CrashScreen error={error} onFix={busy ? null : stylus.fixCrash} />}
        >
          {children}
        </AppErrorBoundary>
      </View>
      {mode !== "idle" && <StylusOverlay stylus={stylus} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
