/**
 * Single source of truth for operator identity: origin, brand, and the public
 * OAuth client IDs.
 *
 * Nothing in this file is secret — every value is inlined into the client
 * bundle at build time, so server-only credentials stay in
 * `lib/server/integrationsConfig.ts`. Because Next.js inlines `NEXT_PUBLIC_*`
 * during `next build`, these must be present in the build environment, not
 * only at runtime.
 *
 * Set `NEXT_PUBLIC_SITE_URL` to your own origin before deploying. Every value
 * that used to be a hardcoded domain literal now derives from it.
 */

const FALLBACK_SITE_URL = "http://localhost:3000";

/** Canonical origin, no trailing slash. e.g. `https://example.com` */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL).replace(/\/+$/, "");

/** Brand shown in metadata, the admin panel, and operator-facing copy. */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Zenox";

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "localhost";
  }
}

/**
 * Registrable domain that owns the site. Subdomains of it are trusted for the
 * admin cookie scope and the playback referer allowlist, so keep it apex
 * (`example.com`, not `www.example.com`).
 */
export const SITE_DOMAIN = (process.env.NEXT_PUBLIC_SITE_DOMAIN || hostnameOf(SITE_URL)).toLowerCase();

/** Hostname of SITE_URL, which may be a subdomain of SITE_DOMAIN. */
export const SITE_HOSTNAME = hostnameOf(SITE_URL);

/**
 * Exact redirect URI handed to every OAuth provider. Register this string
 * verbatim in each provider's developer console or the exchange is rejected.
 */
export const OAUTH_REDIRECT_URI = SITE_URL;

/**
 * OAuth client IDs are public by design — they appear in the authorize URL the
 * browser navigates to. The matching secrets are server-side only.
 * An empty value disables that provider's connect button.
 */
export const OAUTH_CLIENT_IDS = {
  trakt: process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID || "",
  simkl: process.env.NEXT_PUBLIC_SIMKL_CLIENT_ID || "",
  mal: process.env.NEXT_PUBLIC_MAL_CLIENT_ID || "",
  anilist: process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID || "",
} as const;

/** True when the provider has a client ID configured. */
export function isOAuthConfigured(provider: keyof typeof OAUTH_CLIENT_IDS): boolean {
  return OAUTH_CLIENT_IDS[provider].length > 0;
}

/**
 * Exact hostname that serves the admin panel, e.g. `admin.example.com`.
 *
 * Matched in full rather than by prefix: a prefix test would hand the admin
 * surface to any host that merely began with the same letters. ANALYTICS_DOMAIN
 * is still read so an existing deployment keeps working after the rename.
 */
export function adminDomain(): string {
  const configured = (process.env.ADMIN_DOMAIN || process.env.ANALYTICS_DOMAIN || "")
    .trim()
    .toLowerCase();
  if (configured.length > 0) return configured;
  return `admin.${SITE_DOMAIN}`;
}
