export const cardTokens = {
  background: "#FFFFFF",
  borderRadius: "22px",
  borderColor: "#EEF2F6",
  shadow: "0 18px 44px rgba(15, 23, 42, 0.07)",
  paddingDesktop: "24px",
  paddingMobile: "20px",
  textPrimary: "#0F172A",
  textMuted: "#64748B",
  divider: "#EEF2F6",
  focusRing: "0 0 0 3px rgba(14, 75, 90, 0.25)",
  progressTrack: "#EEF2F6",
  progressPrimary: "#5B6DFF",
  progressSecondary: "#7B86F8",
} as const;

export type CardTokenKey = keyof typeof cardTokens;
