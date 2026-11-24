import { Easing, useColorScheme } from "react-native";

const LIGHT = {
  dim: "rgba(0, 0, 0, 0.16)",
  sheet: "#FFFFFF",
  sheetBorder: "rgba(0, 0, 0, 0.06)",
  sheetShadow: "0 -1px 0 rgba(0, 0, 0, 0.03), 0 -16px 48px rgba(0, 0, 0, 0.12)",
  floatingShadow: "0 1px 2px rgba(0, 0, 0, 0.06), 0 10px 30px rgba(0, 0, 0, 0.14)",
  surface: "#F4F4F6",
  surfaceRaised: "#E8E8ED",
  divider: "rgba(0, 0, 0, 0.06)",
  handle: "rgba(0, 0, 0, 0.14)",
  text: "#17171A",
  secondary: "#5E5E68",
  tertiary: "#9B9BA4",
  accent: "#2F6BFF",
  accentSoft: "rgba(47, 107, 255, 0.1)",
  onAccent: "#FFFFFF",
  success: "#1E9E61",
  danger: "#D9433F",
  added: "#167A43",
  addedFill: "rgba(30, 158, 97, 0.12)",
  removed: "#B8352F",
  removedFill: "rgba(217, 67, 63, 0.1)",
  keyboard: "light" as "light" | "dark",
};

export type Palette = typeof LIGHT;

const DARK: Palette = {
  dim: "rgba(0, 0, 0, 0.32)",
  sheet: "#1C1C1F",
  sheetBorder: "rgba(255, 255, 255, 0.08)",
  sheetShadow: "0 -16px 48px rgba(0, 0, 0, 0.45)",
  floatingShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
  surface: "#26262A",
  surfaceRaised: "#33333A",
  divider: "rgba(255, 255, 255, 0.07)",
  handle: "rgba(255, 255, 255, 0.2)",
  text: "#F4F4F6",
  secondary: "#A6A6AF",
  tertiary: "#6F6F78",
  accent: "#4C8DFF",
  accentSoft: "rgba(76, 141, 255, 0.16)",
  onAccent: "#FFFFFF",
  success: "#3CCB85",
  danger: "#FF6B6B",
  added: "#7EE2A8",
  addedFill: "rgba(46, 160, 67, 0.18)",
  removed: "#FFA198",
  removedFill: "rgba(248, 81, 73, 0.16)",
  keyboard: "dark",
};

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? DARK : LIGHT;
}

/** Builds a component's styles once per appearance and returns a hook that picks the current one. */
export function themedStyles<T>(factory: (palette: Palette) => T): () => T {
  const light = factory(LIGHT);
  const dark = factory(DARK);
  return function useStyles() {
    return useColorScheme() === "dark" ? dark : light;
  };
}

export const motion = {
  easeOut: Easing.bezier(0.23, 1, 0.32, 1),
  easeInOut: Easing.bezier(0.45, 0, 0.55, 1),
};
