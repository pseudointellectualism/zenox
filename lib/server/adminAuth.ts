import crypto from "crypto";
import { cookies } from "next/headers";

import { isHashedPassword, verifyPassword } from "@/lib/server/passwordHash";

export const ADMIN_SESSION_COOKIE = "zenox_admin_session";
export const ADMIN_GATE_COOKIE = "zenox_gate_verified";

interface AdminUser {
  username: string;
  role: "owner";
}

/**
 * HMAC key for admin session tokens.
 *
 * There is deliberately no fallback: a known default would let anyone forge a
 * signed owner session. When ADMIN_SESSION_SECRET is unset the server mints a
 * random per-process key, which signs nothing anyone else can predict and
 * invalidates sessions on restart.
 */
function getSecret(): Buffer {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && secret.trim().length > 0) {
    return crypto.createHash("sha256").update(secret.trim()).digest();
  }
  const globalAny = globalThis as unknown as { __zenoxEphemeralAdminSecret?: Buffer };
  if (!globalAny.__zenoxEphemeralAdminSecret) {
    console.warn(
      "[AdminAuth] ADMIN_SESSION_SECRET is unset — using an ephemeral key. Admin sessions will not survive a restart.",
    );
    globalAny.__zenoxEphemeralAdminSecret = crypto.randomBytes(32);
  }
  return globalAny.__zenoxEphemeralAdminSecret;
}

function timingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Owner accounts, read from ADMIN_USER_1..n / ADMIN_PASS_1..n.
 *
 * No credentials are compiled into the build. With nothing configured the list
 * is empty and every login attempt fails, which is the correct posture for a
 * fresh deployment: configure the environment before the panel opens.
 */
function getOwnerAccounts(): Array<{ username: string; password: string }> {
  const accounts: Array<{ username: string; password: string }> = [];

  for (let i = 1; i <= 8; i += 1) {
    const username = (process.env[`ADMIN_USER_${i}`] || "").trim().toLowerCase();
    const password = (process.env[`ADMIN_PASS_${i}`] || "").trim();
    if (username.length > 0 && password.length > 0) {
      accounts.push({ username, password });
    }
  }

  return accounts;
}

/**
 * Validates login credentials against the configured owner accounts.
 *
 * Passwords are compared against scrypt digests, so the environment never
 * holds anything directly usable. Every candidate account is checked even
 * after a match so the work done — and therefore the time taken — does not
 * reveal which username exists.
 */
export function authenticateOwner(username: string, password: string): AdminUser | null {
  const cleanUser = (username || "").trim().toLowerCase();
  const cleanPass = (password || "").trim();
  if (cleanUser.length === 0 || cleanPass.length === 0) return null;

  const accounts = getOwnerAccounts();
  if (accounts.length === 0) {
    console.warn("[AdminAuth] No owner accounts configured — set ADMIN_USER_1 and ADMIN_PASS_1.");
    return null;
  }

  let matched: AdminUser | null = null;

  for (const account of accounts) {
    if (!isHashedPassword(account.password)) {
      console.warn(
        `[AdminAuth] ADMIN_PASS for "${account.username}" is stored in clear text. Replace it with a digest from scripts/hash-password.mjs.`,
      );
    }
    const ok = verifyPassword(cleanPass, account.password);
    if (ok && cleanUser === account.username && matched === null) {
      matched = { username: account.username, role: "owner" };
    }
  }

  return matched;
}

/**
 * Creates an encrypted & signed session token
 */
export function createSessionToken(user: AdminUser): string {
  const secret = getSecret();
  const payload = {
    username: user.username,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };

  const dataStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(dataStr).digest("base64url");
  return `${dataStr}.${signature}`;
}

/**
 * Verifies session token string
 */
export function verifySessionToken(token: string | null | undefined): AdminUser | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [dataStr, signature] = parts;
  const secret = getSecret();
  const expectedSig = crypto.createHmac("sha256", secret).update(dataStr).digest("base64url");

  if (!timingSafeEqual(signature, expectedSig)) return null;

  try {
    const payload = JSON.parse(Buffer.from(dataStr, "base64url").toString("utf-8"));
    if (payload.exp && payload.exp < Date.now()) return null;
    if (!payload.username) return null;
    return { username: payload.username, role: payload.role || "owner" };
  } catch {
    return null;
  }
}

/**
 * Checks if current incoming request has a valid admin session
 */
export async function getAdminSessionFromCookies(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}
