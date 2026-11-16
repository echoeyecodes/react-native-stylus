import { Image, StyleSheet } from "react-native";
import type { Screenshot } from "../../shared/protocol";

type Props = {
  screenshot: Screenshot;
  visible: boolean;
};

/**
 * The app as it looked before a change, drawn over the live app. It stays mounted while hidden so
 * the image is already decoded when the developer holds Compare.
 */
export function BeforeScreen({ screenshot, visible }: Props) {
  return (
    <Image
      pointerEvents="none"
      source={{ uri: `data:image/jpeg;base64,${screenshot.base64}` }}
      style={[StyleSheet.absoluteFill, { opacity: visible ? 1 : 0 }]}
    />
  );
}
