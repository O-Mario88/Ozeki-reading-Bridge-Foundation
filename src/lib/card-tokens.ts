import { uiTokens } from "@/ui/tokens";

export const cardTokens = {
  background: uiTokens.neutral.surface,
  borderRadius: `${uiTokens.radius.lg}px`,
  borderColor: uiTokens.neutral.border,
  shadow: uiTokens.shadow.sm,
  paddingDesktop: `${uiTokens.space[5]}px`,
  paddingMobile: `${uiTokens.space[4]}px`,
  textPrimary: uiTokens.neutral.text,
  textMuted: uiTokens.neutral.textMuted,
  divider: uiTokens.neutral.border,
  focusRing: "0 0 0 3px color-mix(in oklab, var(--color-brand-blue), white 72%)",
  progressTrack: uiTokens.neutral.border,
  progressPrimary: uiTokens.brand.blue.primary,
  progressSecondary: uiTokens.brand.orange.primary,
} as const;

export type CardTokenKey = keyof typeof cardTokens;
