/**
 * Phone-number normalisation for Uganda donor / sponsor / contact intake.
 *
 * Goals:
 *  - reject obvious junk (`abc def 123`) before storing
 *  - keep what users actually enter (spaces, dashes, +, parentheses)
 *  - emit a canonical digits-only form for analytics + outbound calls
 *
 * Returns `null` when the input does not look like a phone number at all
 * (so callers can `if (!normalised) return 400`). Returns a trimmed string
 * preserving the user's separators when valid; the canonical digit form is
 * available via `digitsOnly`.
 */

const PHONE_PATTERN = /^[\d\s\-+()]+$/;

export interface NormalisedPhone {
  /** What the user typed, trimmed. */
  display: string;
  /** Digits only, leading + replaced. Useful for outbound dialling/SMS. */
  digitsOnly: string;
}

export function normalisePhoneNumber(raw: string | null | undefined): NormalisedPhone | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < 6 || trimmed.length > 32) return null;
  if (!PHONE_PATTERN.test(trimmed)) return null;
  const digits = trimmed.replace(/[^\d]/g, "");
  // After stripping all separators we still need at least 6 actual digits.
  if (digits.length < 6) return null;
  return { display: trimmed, digitsOnly: digits };
}
