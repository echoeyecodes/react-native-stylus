import { TurboModuleRegistry, type TurboModule } from "react-native";

interface DevSettingsModule extends TurboModule {
  setHotLoadingEnabled(enabled: boolean): void;
}

const devSettings = TurboModuleRegistry.get<DevSettingsModule>("DevSettings");

/** Metro's client queues and merges updates while paused, so the app never runs a half-finished change. */
export function pauseFastRefresh() {
  devSettings?.setHotLoadingEnabled(false);
}

/** Applies everything held since the pause as one update. */
export function resumeFastRefresh() {
  devSettings?.setHotLoadingEnabled(true);
}
