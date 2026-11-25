import "server-only";

/**
 * OAuth application credentials for the tracker integrations.
 *
 * Every value comes from the environment. There are NO fallback credentials:
 * shipping a working client secret in source would hand anyone who reads the
 * repo control of the connected accounts. Register your own application with
 * each provider and set the matching variables.
 *
 * The client IDs are duplicated as `NEXT_PUBLIC_*` in `lib/siteConfig.ts`
 * because the browser needs them to build the authorize URL. The secrets below
 * must never be given a `NEXT_PUBLIC_` prefix.
 */

export const TRAKT_CONFIG = {
  CLIENT_ID: process.env.TRAKT_CLIENT_ID || "",
  CLIENT_SECRET: process.env.TRAKT_CLIENT_SECRET || "",
  API_URL: "https://api.trakt.tv",
};

export const SIMKL_CONFIG = {
  CLIENT_ID: process.env.SIMKL_CLIENT_ID || "",
  CLIENT_SECRET: process.env.SIMKL_CLIENT_SECRET || "",
  API_URL: "https://api.simkl.com",
  APP_NAME: process.env.NEXT_PUBLIC_SITE_NAME || "Zenox",
  APP_VERSION: "1.0",
};

export const MAL_CONFIG = {
  CLIENT_ID: process.env.MAL_CLIENT_ID || "",
  CLIENT_SECRET: process.env.MAL_CLIENT_SECRET || "",
  API_URL: "https://api.myanimelist.net/v2",
  AUTH_URL: "https://myanimelist.net/v1/oauth2",
};

export const ANILIST_CONFIG = {
  CLIENT_ID: process.env.ANILIST_CLIENT_ID || "",
  CLIENT_SECRET: process.env.ANILIST_CLIENT_SECRET || "",
  API_URL: "https://graphql.anilist.co",
  AUTH_URL: "https://anilist.co/api/v2/oauth",
};

/**
 * True when both halves of a provider's OAuth application are present.
 *
 * Routes check this before calling out: with an empty client id the provider
 * answers with its own error shape, which surfaces to the user as a failed
 * sign-in rather than a feature the operator has not set up.
 */
export function isProviderConfigured(config: { CLIENT_ID: string; CLIENT_SECRET: string }): boolean {
  return config.CLIENT_ID.trim().length > 0 && config.CLIENT_SECRET.trim().length > 0;
}
