export const colors = {
  background: "#F7F7F9",
  surface: "#FFFFFF",
  text: "#0F1115",
  textSecondary: "#62666F",
  textTertiary: "#A0A4AD",
  border: "#E7E8EC",
  accent: "#3B4BF5",
  accentSoft: "#E9EBFE",
  onAccent: "#FFFFFF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};

export const type = {
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.6 },
  subtitle: { fontSize: 15, fontWeight: "400" },
  tab: { fontSize: 15 },
  itemName: { fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
  body: { fontSize: 14, fontWeight: "400" },
  price: { fontSize: 15, fontWeight: "500" },
  caption: { fontSize: 13, fontWeight: "400" },
  total: { fontSize: 18, fontWeight: "600", letterSpacing: -0.3 },
  button: { fontSize: 15, fontWeight: "600" },
} as const;
