export const uiTokens = {
  brand: {
    blue: {
      primary: "#084f66",
      dark: "#063748",
    },
    orange: {
      primary: "#FA7D15",
      dark: "#CF620B",
    },
  },
  neutral: {
    bg: "#F6F8FA",
    surface: "#FFFFFF",
    surfaceSoft: "#F2F5F8",
    border: "#D8E2EA",
    text: "#1F2C38",
    textMuted: "#5D7081",
  },
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 24,
    6: 32,
    7: 40,
    8: 48,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
  },
  shadow: {
    sm: "0 1px 2px rgba(12, 27, 39, 0.06), 0 4px 14px rgba(12, 27, 39, 0.06)",
    md: "0 8px 24px rgba(12, 27, 39, 0.12), 0 2px 8px rgba(12, 27, 39, 0.08)",
  },
  typography: {
    fontFamilyUi: "Inter, Segoe UI, Helvetica Neue, Arial, sans-serif",
    h1: "clamp(2rem, 3.5vw + 0.8rem, 3.15rem)",
    h2: "clamp(1.45rem, 1.2vw + 1rem, 2.15rem)",
    h3: "clamp(1.2rem, 0.6vw + 0.95rem, 1.5rem)",
    body: "0.95rem",
    small: "0.82rem",
  },
} as const;

export type UiTokens = typeof uiTokens;
