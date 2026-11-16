import { TurboModuleRegistry, type TurboModule } from "react-native";

interface DevSettingsModule extends TurboModule {
  setHotLoadingEnabled(enabled: boolean): void;
}

const devSettings = TurboModuleRegistry.get<DevSettingsModule>("DevSettings");

/**
 * Holds Fast Refresh updates while Claude works. Metro's client queues and merges the updates that
 * arrive in the meantime, so the app never runs a half-finished change.
 */
export function pauseFastRefresh() {
  devSettings?.setHotLoadingEnabled(false);
}

/** Applies everything held since the pause in one update. */
export function resumeFastRefresh() {
  devSettings?.setHotLoadingEnabled(true);
}
