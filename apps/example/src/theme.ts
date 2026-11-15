import type { TextStyle } from "react-native";

export const colors = {
  background: "#F7F3EE",
  surface: "#FFFFFF",
  surfaceMuted: "#F0EAE3",
  surfacePressed: "#E9E1D8",
  ink: "#1E1712",
  inkSecondary: "#6F635A",
  inkTertiary: "#A3978C",
  line: "#E6DED5",
  espresso: "#2B1F18",
  onEspresso: "#FBF7F2",
  caramel: "#B8622F",
  caramelSoft: "#F4E6DA",
  success: "#3F7A52",
  scrim: "rgba(20, 14, 10, 0.55)",
};

export const fonts = {
  display: "Fraunces_600SemiBold",
  displayMedium: "Fraunces_500Medium",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
};

export const type = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  headline: { fontFamily: fonts.display, fontSize: 21, lineHeight: 27, letterSpacing: -0.3 },
  itemName: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 14.5, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 14.5, lineHeight: 21 },
  label: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  captionStrong: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  price: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, fontVariant: ["tabular-nums"] },
} satisfies Record<string, TextStyle>;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
};

export const shadows = {
  card: "0 1px 2px rgba(43, 31, 24, 0.05), 0 8px 24px rgba(43, 31, 24, 0.07)",
  floating: "0 2px 6px rgba(43, 31, 24, 0.12), 0 16px 40px rgba(43, 31, 24, 0.22)",
  sheet: "0 -8px 40px rgba(43, 31, 24, 0.18)",
};
