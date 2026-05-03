/**
 * Centralised password policy. Both the change-password endpoint and the
 * admin user-create endpoint should validate against this so we can't
 * accidentally accept a weak admin password through one route while
 * blocking it on another.
 *
 * The policy is deliberately simple — length, mixed case, digit, symbol,
 * and a small block-list of trivial passwords. We intentionally do NOT
 * pull in a 100k-entry corpus; the value of a Tier-1 dictionary check
 * is small once you have rate-limiting + Argon2 + MFA-for-admins, and
 * the cost (bundle size, startup time) isn't worth it.
 */

export interface PasswordPolicyResult {
  ok: boolean;
  errors: string[];
}

const MIN_LENGTH = 10;

/** Common passwords — short hand-curated list. Kept small on purpose. */
const TRIVIAL_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "p@ssword",
  "p@ssw0rd",
  "qwerty",
  "qwerty123",
  "abc12345",
  "12345678",
  "11111111",
  "letmein",
  "letmein1",
  "welcome",
  "welcome1",
  "admin",
  "admin123",
  "administrator",
  "iloveyou",
  "monkey123",
  "ozeki",
  "ozeki123",
  "ozekiread",
  "ozekireading",
  "uganda",
  "uganda123",
  "kampala",
  "kampala123",
  "literacy",
  "literacy123",
  "changeme",
  "changeme1",
  "default",
  "default1",
]);

export function evaluatePasswordPolicy(
  password: string,
  context?: { fullName?: string | null; email?: string | null },
): PasswordPolicyResult {
  const errors: string[] = [];
  const trimmed = password ?? "";

  if (trimmed.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters.`);
  }
  if (!/[A-Z]/.test(trimmed)) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(trimmed)) {
    errors.push("Password must contain at least one lowercase letter.");
  }
  if (!/[0-9]/.test(trimmed)) {
    errors.push("Password must contain at least one number.");
  }
  if (!/[^A-Za-z0-9]/.test(trimmed)) {
    errors.push("Password must contain at least one symbol.");
  }
  if (/^(.)\1+$/.test(trimmed)) {
    errors.push("Password cannot be a single repeated character.");
  }

  const lower = trimmed.toLowerCase();
  if (TRIVIAL_PASSWORDS.has(lower)) {
    errors.push("That password is on a public block-list of common passwords. Pick something less guessable.");
  }

  // Do not let the user encode their own name or email-local-part as the password.
  const email = context?.email?.trim().toLowerCase() ?? "";
  const emailLocal = email.split("@")[0] ?? "";
  if (emailLocal && emailLocal.length >= 4 && lower.includes(emailLocal)) {
    errors.push("Password must not contain your email username.");
  }
  const name = context?.fullName?.trim().toLowerCase() ?? "";
  if (name) {
    for (const part of name.split(/\s+/)) {
      if (part.length >= 4 && lower.includes(part)) {
        errors.push("Password must not contain your name.");
        break;
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Helper for endpoints that want a single short error message rather than
 * the full list. Returns `null` when the password passes.
 */
export function firstPasswordPolicyError(
  password: string,
  context?: { fullName?: string | null; email?: string | null },
): string | null {
  const result = evaluatePasswordPolicy(password, context);
  return result.ok ? null : (result.errors[0] ?? "Password does not meet complexity requirements.");
}
