import { Image, StyleSheet, View } from "react-native";
import type { Rect, Screenshot } from "../../shared/protocol";
import { themedStyles } from "../theme";

type Props = {
  screenshot: Screenshot;
  /** The element's frame, in the screenshot's points. */
  frame: Rect;
  width: number;
  height: number;
};

const INSET = 6;
/** How small a wide element may get before it runs past the edge instead. */
const MIN_WIDE_SCALE = 0.5;

/** A crop of `screenshot` around one element, scaled so the element reads at a glance. */
export function ElementThumbnail({ screenshot, frame, width, height }: Props) {
  const styles = useStyles();
  // Fits the element's height, and lets a wide element run past the right edge rather than shrink to nothing.
  const scale = Math.min(1, (height - INSET * 2) / frame.height, Math.max(MIN_WIDE_SCALE, (width * 1.6) / frame.width));
  const scaledWidth = frame.width * scale;
  const left = scaledWidth <= width - INSET * 2 ? (width - scaledWidth) / 2 - frame.x * scale : INSET - frame.x * scale;
  const top = height / 2 - (frame.y + frame.height / 2) * scale;

  return (
    <View style={[styles.frame, { width, height }]}>
      <Image
        source={{ uri: `data:image/jpeg;base64,${screenshot.base64}` }}
        style={{ position: "absolute", left, top, width: screenshot.width * scale, height: screenshot.height * scale }}
      />
    </View>
  );
}

const useStyles = themedStyles((palette) =>
  StyleSheet.create({
    frame: {
      overflow: "hidden",
      borderRadius: 10,
      borderCurve: "continuous",
      backgroundColor: palette.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.sheetBorder,
    },
  }),
);
