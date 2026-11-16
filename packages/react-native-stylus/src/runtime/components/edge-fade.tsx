import { useId } from "react";
import { StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

type Props = {
  side: "left" | "right";
  /** The colour behind the scrolling content, which the fade blends into. */
  color: string;
  width?: number;
};

/** Fades scrolling content into its background at one edge, to show there is more that way. */
export function EdgeFade({ side, color, width = 28 }: Props) {
  const id = useId();
  return (
    <Svg pointerEvents="none" width={width} style={[styles.fade, side === "left" ? styles.left : styles.right]}>
      <Defs>
        <LinearGradient id={id} x1={side === "left" ? "0" : "1"} y1="0" x2={side === "left" ? "1" : "0"} y2="0">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fade: { position: "absolute", top: 0, bottom: 0 },
  left: { left: 0 },
  right: { right: 0 },
});
