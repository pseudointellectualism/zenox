import "server-only";
import crypto from "crypto";

/**
 * Password storage for the owner accounts.
 *
 * Passwords are kept as scrypt digests, never in clear text. A digest in the
 * environment is useless to anyone who reads it: they would still have to
 * brute-force the original, and scrypt's memory cost makes that expensive per
 * guess rather than cheap in bulk the way a plain hash would be.
 *
 * Stored format, carrying its own work factors so they can be raised later
 * without invalidating existing entries:
 *
 *   scrypt:<N>:<r>:<p>:<salt-base64url>:<digest-base64url>
 *
 * Colon-delimited and base64url rather than the conventional `$` and base64:
 * these values live in .env, and Next's dotenv loader performs variable
 * expansion, so a `$1` inside a digest is silently replaced with nothing and
 * the stored password becomes unverifiable.
 *
 * Generate one with `node scripts/hash-password.mjs`, which reads the password
 * from a hidden prompt so it never lands in shell history.
 */

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

// scrypt needs roughly 128 * N * r bytes; Node's default cap is below that for
// these parameters, so raise it explicitly rather than failing at runtime.
const MAX_MEM = 64 * 1024 * 1024;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const digest = crypto.scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEM,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    digest.toString("base64url"),
  ].join(":");
}

/** True when `stored` is in the scrypt digest format rather than clear text. */
export function isHashedPassword(stored: string): boolean {
  return typeof stored === "string" && stored.startsWith("scrypt:");
}

/**
 * Constant-time verification. Returns false for any malformed digest rather
 * than throwing, so a corrupted environment value denies access instead of
 * crashing the route and leaking a stack trace.
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (!password || !stored) return false;

  if (!isHashedPassword(stored)) {
    // Clear-text fallback, kept only so an existing deployment keeps working
    // through the migration. Compared in constant time all the same.
    const a = Buffer.from(password);
    const b = Buffer.from(stored);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  const parts = stored.split(":");
  if (parts.length !== 6) return false;

  const [, nRaw, rRaw, pRaw, saltB64, digestB64] = parts;
  const N = Number.parseInt(nRaw, 10);
  const r = Number.parseInt(rRaw, 10);
  const p = Number.parseInt(pRaw, 10);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  try {
    const salt = Buffer.from(saltB64, "base64url");
    const expected = Buffer.from(digestB64, "base64url");
    if (salt.length === 0 || expected.length === 0) return false;

    const actual = crypto.scryptSync(password.normalize("NFKC"), salt, expected.length, {
      N,
      r,
      p,
      maxmem: MAX_MEM,
    });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
