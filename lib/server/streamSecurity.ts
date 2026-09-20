import crypto from "crypto";

import { SITE_DOMAIN, SITE_URL } from "@/lib/siteConfig";

export interface StreamTokenPayload {
  mediaId: number | string;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  serverIndex?: number;
  title?: string;
  year?: string | number;
  imdbId?: string;
  exp: number; // Unix timestamp in ms
  ipHash?: string;
}

/**
 * Resolves the 32-byte encryption key strictly from environment variables.
 * If unset, it generates an ephemeral in-memory random buffer per server instance.
 * No secrets are ever hardcoded in the codebase.
 */
function getSecretKey(): Buffer {
  const envSecret = process.env.STREAM_TOKEN_SECRET;
  if (envSecret && envSecret.trim().length > 0) {
    return crypto.createHash("sha256").update(envSecret.trim()).digest();
  }
  const globalAny = globalThis as unknown as { __zenoxEphemeralSecret?: Buffer };
  if (!globalAny.__zenoxEphemeralSecret) {
    globalAny.__zenoxEphemeralSecret = crypto.randomBytes(32);
  }
  return globalAny.__zenoxEphemeralSecret;
}

/**
 * Reliably extracts the real client IP using platform and reverse-proxy headers.
 * Prioritizes unforgeable edge headers: x-vercel-ip, cf-connecting-ip, x-real-ip,
 * followed by the first entry in x-forwarded-for.
 */
export function extractClientIp(headers: Headers | { get(name: string): string | null }): string {
  const vercelIp = headers.get("x-vercel-ip") || headers.get("x-vercel-forwarded-for");
  if (vercelIp && vercelIp.trim().length > 0) {
    return vercelIp.split(",")[0].trim();
  }

  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim().length > 0) {
    return cfIp.trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor && forwardedFor.trim().length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return "127.0.0.1";
}

/**
 * Extra hostnames trusted alongside SITE_DOMAIN, from STREAM_ALLOWED_HOSTS
 * (comma separated). Use it for a staging host or a second brand domain.
 */
function extraAllowedHosts(): string[] {
  return (process.env.STREAM_ALLOWED_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h.length > 0);
}

/**
 * Validates whether an Origin or Referer header belongs to an authorized
 * domain for this deployment. The allowlist is the operator's own
 * `SITE_DOMAIN` and its subdomains — never a hardcoded literal — so a fork
 * running on another domain cannot mint playback tokens against this one.
 * Blocks external domains, bare IP addresses, and third-party scrapers.
 */
export function isValidZenoxOrigin(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    // The operator's own domain and any subdomain of it.
    if (SITE_DOMAIN && (host === SITE_DOMAIN || host.endsWith(`.${SITE_DOMAIN}`))) {
      return true;
    }

    // Additional hosts the operator explicitly trusts.
    for (const allowed of extraAllowedHosts()) {
      if (host === allowed || host.endsWith(`.${allowed}`)) {
        return true;
      }
    }

    // Local development support
    if (process.env.NODE_ENV !== "production") {
      if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Validates request headers for stream security.
 * Enforces:
 *  1. Non-blank Referer from an authorized Zenox domain
 *  2. Disallows direct browser URL bar navigation (Sec-Fetch-Mode: navigate)
 *  3. Verifies Origin header if present
 *  4. Provides the matching CORS Origin to return
 */
export function validateStreamRequest(
  headers: Headers | { get(name: string): string | null },
): { allowed: boolean; reason?: string; allowedOrigin?: string } {
  const referer = headers.get("referer");
  const origin = headers.get("origin");
  const secFetchMode = headers.get("sec-fetch-mode");

  // 1. Block direct browser navigation (user typing or pasting link directly in URL bar)
  if (secFetchMode === "navigate") {
    return {
      allowed: false,
      reason: "403",
    };
  }

  // 2. Reject blank or missing referers
  if (!referer || referer.trim().length === 0) {
    return {
      allowed: false,
      reason: "Missing or blank referer header. Direct external access is forbidden.",
    };
  }

  // 3. Validate referer is from an authorized domain
  if (!isValidZenoxOrigin(referer)) {
    return {
      allowed: false,
      reason: `Unauthorized referer domain. Access is restricted to ${SITE_DOMAIN}.`,
    };
  }

  // 4. If Origin header is present (CORS fetch), validate it too
  if (origin && !isValidZenoxOrigin(origin)) {
    return {
      allowed: false,
      reason: "Unauthorized origin header. Cross-origin requests from external domains are rejected.",
    };
  }

  // Determine allowed origin for CORS
  let allowedOrigin = SITE_URL;
  if (origin && isValidZenoxOrigin(origin)) {
    try {
      allowedOrigin = new URL(origin).origin;
    } catch {
      allowedOrigin = SITE_URL;
    }
  } else if (referer && isValidZenoxOrigin(referer)) {
    try {
      allowedOrigin = new URL(referer).origin;
    } catch {
      allowedOrigin = SITE_URL;
    }
  }

  return {
    allowed: true,
    allowedOrigin,
  };
}

/**
 * Creates a short SHA-256 fingerprint of the client IP to bind tokens
 * to the requester and prevent link sharing across different networks.
 */
export function hashClientIp(ip: string | null | undefined): string {
  if (!ip) return "unknown";
  return crypto.createHash("sha256").update(ip.trim()).digest("hex").slice(0, 16);
}

/**
 * Mints an opaque AES-256-GCM encrypted token.
 * Output format: z_<base64url(iv + tag + ciphertext)>
 */
export function mintStreamToken(
  data: Omit<StreamTokenPayload, "exp" | "ipHash">,
  clientIp?: string | null,
  ttlSeconds: number = 180,
): string {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const secretKey = getSecretKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey, iv);

  const payload: StreamTokenPayload = {
    ...data,
    exp: Date.now() + ttlSeconds * 1000,
    ipHash: clientIp ? hashClientIp(clientIp) : undefined,
  };

  const plaintext = JSON.stringify(payload);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag(); // 128-bit authentication tag

  // Pack: 12 bytes IV + 16 bytes Tag + Ciphertext
  const packed = Buffer.concat([iv, tag, ciphertext]);
  return `z_${packed.toString("base64url")}`;
}

/**
 * Decrypts and validates an opaque stream token.
 */
export function verifyStreamToken(
  token: string,
  clientIp?: string | null,
): { valid: true; payload: StreamTokenPayload } | { valid: false; reason: string } {
  if (!token || !token.startsWith("z_")) {
    return { valid: false, reason: "Invalid token format" };
  }

  try {
    const raw = token.slice(2);
    const packed = Buffer.from(raw, "base64url");

    if (packed.length < 28) {
      // 12 (IV) + 16 (Tag) = 28 bytes min
      return { valid: false, reason: "Malformed token length" };
    }

    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const ciphertext = packed.subarray(28);

    const secretKey = getSecretKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const payload = JSON.parse(decrypted.toString("utf8")) as StreamTokenPayload;

    // Check expiration
    if (Date.now() > payload.exp) {
      return { valid: false, reason: "Token expired" };
    }

    // Check IP fingerprint if available and non-dev
    if (payload.ipHash && clientIp && process.env.NODE_ENV === "production") {
      const currentIpHash = hashClientIp(clientIp);
      if (payload.ipHash !== currentIpHash) {
        return { valid: false, reason: "IP mismatch" };
      }
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, reason: "Decryption or authentication failed" };
  }
}
