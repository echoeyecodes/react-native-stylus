import { TurboModuleRegistry, type TurboModule } from "react-native";

interface SourceCodeModule extends TurboModule {
  getConstants(): { scriptURL: string | null };
}

/** The Metro server this bundle was loaded from, such as `http://192.168.1.5:8081`. */
export function devServerOrigin(): string | null {
  const scriptURL = TurboModuleRegistry.get<SourceCodeModule>("SourceCode")?.getConstants().scriptURL;
  return scriptURL?.match(/^https?:\/\/[^/]+/)?.[0] ?? null;
}
