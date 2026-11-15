import { Dimensions, type HostInstance } from "react-native";
import { captureRef } from "react-native-view-shot";
import type { Screenshot } from "../shared/protocol";

/** Twice the point size keeps text legible to the model without sending a full-resolution image. */
const SCALE = 2;

/** Captures the app's own views, leaving out the Stylus overlay drawn above them. */
export async function captureScreen(view: HostInstance): Promise<Screenshot> {
  const { width, height } = Dimensions.get("window");
  const base64 = await captureRef(view, {
    format: "jpg",
    quality: 0.8,
    result: "base64",
    width: width * SCALE,
    height: height * SCALE,
  });
  return { base64, width, height };
}
