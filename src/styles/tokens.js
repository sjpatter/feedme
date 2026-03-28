export const C = {
  // Backgrounds
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#FAFAF9",

  // Borders
  border: "#EDE8E3",
  borderMid: "#D6CFC8",
  cardBorder: "rgba(0,0,0,0.05)",
  cardShadow: "0 4px 20px rgba(168, 67, 42, 0.08)",
  navBorder: "rgba(0,0,0,0.06)",

  // Text
  text: "#111111",
  textSecondary: "#666666",
  textTertiary: "#AAAAAA",

  // Primary (terracotta)
  primary: "#C0472A",
  primaryDark: "#993C1D",
  primaryLight: "#FDF0EC",
  primaryMid: "#E8A898",

  // Secondary (teal)
  secondary: "#0D9488",
  secondaryLight: "#E1F5EE",
  secondaryMid: "#99F6E4",
  secondaryText: "#0F6E56",

  // Semantic
  danger: "#991B1B",
  dangerLight: "#FEF2F2",
  warning: "#78350F",
  warningLight: "#FEF3C7",
  neutral: "#6B7280",
  neutralLight: "#F3F4F6",

  // Legacy aliases (keep for compat)
  infoNeutralBg: "#F3F4F6",
  infoNeutralText: "#374151",
  infoAmberBg: "#FEF3C7",
  infoAmberText: "#78350F",
};

export const FONT = "system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
export const SERIF = "'Georgia', 'Times New Roman', serif";

export const INPUT_STYLE = {
  width: "100%",
  padding: "10px 14px",
  border: "1.5px solid #E8E8E8",
  borderRadius: 10,
  fontSize: 14,
  fontFamily: FONT,
  background: C.surface,
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
};
