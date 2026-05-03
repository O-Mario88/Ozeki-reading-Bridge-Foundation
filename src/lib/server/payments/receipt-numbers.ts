import { randomBytes } from "node:crypto";

/**
 * Generates a finance receipt number with cryptographic randomness.
 *
 *   <prefix>-<YYYY>-<8 hex chars>
 *
 * 4 random bytes ≈ 4.3 billion combinations per prefix per year, with no
 * predictable structure — collisions are vanishingly unlikely under normal
 * load. The DB still enforces UNIQUE on the column; if a collision happens
 * the caller's UNIQUE-violation recovery path kicks in.
 *
 * Replaces the previous `Math.random().toString().substring(2, 8)` pattern
 * which had only ~1M combinations per prefix per year and could therefore
 * collide under reasonable load (~1100 receipts/day = >1% birthday collision
 * chance over a year).
 */
export function generateReceiptNumber(prefix: string): string {
  const year = new Date().getFullYear();
  const token = randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${year}-${token}`;
}
