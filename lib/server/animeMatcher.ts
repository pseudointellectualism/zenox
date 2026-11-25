import { searchCatalog } from "@/lib/tmdb";
import type { MediaSummary } from "@/lib/types";
import { MAL_CONFIG, ANILIST_CONFIG } from "@/lib/server/integrationsConfig";

// In-memory cache for fast lookup during user sessions
const tmdbMatchCache = new Map<string, MediaSummary | null>();
const malIdCache = new Map<string, number | null>();
const anilistIdCache = new Map<string, number | null>();

/**
 * Strips season suffixes, broadcast notes, parts, and brackets from anime titles
 * to ensure high-accuracy matching against TMDB catalog.
 */
export function cleanAnimeTitle(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\s*\([^)]*\)/g, "") // (TV), (2023), etc.
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/[:\-–—]\s*(?:The\s+)?(?:Final\s+)?Season.*$/i, "")
    .replace(/\s*(?:2nd|3rd|\d+(?:st|nd|rd|th)?)\s*Season.*$/i, "")
    .replace(/[:\-–—]\s*Part\s*\d+.*$/i, "")
    .replace(/\s*Season\s*\d+.*$/i, "")
    .replace(/\s*Cour\s*\d+.*$/i, "")
    .trim();
}

/**
 * Searches TMDB for the anime title, attempting English, Romaji, and clean titles.
 */
export async function matchAnimeToTMDB(
  rawTitle: string,
  options?: {
    englishTitle?: string;
    romajiTitle?: string;
    year?: number;
    fallbackImage?: string;
  },
): Promise<MediaSummary | null> {
  const cacheKey = (options?.englishTitle || rawTitle || "").toLowerCase().trim();
  if (tmdbMatchCache.has(cacheKey)) {
    return tmdbMatchCache.get(cacheKey)!;
  }

  const queriesToTry: string[] = [];
  if (options?.englishTitle) queriesToTry.push(cleanAnimeTitle(options.englishTitle));
  if (rawTitle) queriesToTry.push(cleanAnimeTitle(rawTitle));
  if (options?.romajiTitle) queriesToTry.push(cleanAnimeTitle(options.romajiTitle));
  if (options?.englishTitle && !queriesToTry.includes(options.englishTitle)) queriesToTry.push(options.englishTitle);
  if (rawTitle && !queriesToTry.includes(rawTitle)) queriesToTry.push(rawTitle);

  for (const q of queriesToTry) {
    if (!q || q.length < 2) continue;
    try {
      const results = await searchCatalog(q);
      if (results && results.length > 0) {
        // Find best match: prioritize TV show, animation genre (16), or matching year
        const match =
          results.find(
            (r) =>
              r.mediaType === "tv" &&
              (r.genreIds?.includes(16) || (options?.year && r.releaseDate?.startsWith(String(options.year)))),
          ) ||
          results.find((r) => r.mediaType === "tv") ||
          results[0];

        if (match) {
          tmdbMatchCache.set(cacheKey, match);
          return match;
        }
      }
    } catch {
      // Continue trying alternatives
    }
  }

  tmdbMatchCache.set(cacheKey, null);
  return null;
}

/**
 * Resolves a MyAnimeList anime ID from a TMDB title.
 */
export async function resolveMalId(title: string): Promise<number | null> {
  const clean = cleanAnimeTitle(title);
  const cacheKey = clean.toLowerCase();
  if (malIdCache.has(cacheKey)) {
    return malIdCache.get(cacheKey)!;
  }

  try {
    const res = await fetch(
      `${MAL_CONFIG.API_URL}/anime?q=${encodeURIComponent(clean)}&limit=1`,
      {
        headers: {
          "X-MAL-CLIENT-ID": MAL_CONFIG.CLIENT_ID,
          "User-Agent": "Zenox/1.0",
        },
      },
    );
    if (!res.ok) {
      malIdCache.set(cacheKey, null);
      return null;
    }
    const data = await res.json();
    const id = data?.data?.[0]?.node?.id ?? null;
    malIdCache.set(cacheKey, id);
    return id;
  } catch {
    malIdCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Resolves an AniList anime ID from a TMDB title using authenticated or public queries.
 */
export async function resolveAniListId(
  title: string,
  accessToken?: string,
): Promise<number | null> {
  const clean = cleanAnimeTitle(title);
  const cacheKey = clean.toLowerCase();
  if (anilistIdCache.has(cacheKey)) {
    return anilistIdCache.get(cacheKey)!;
  }

  const query = `
    query ($search: String) {
      Media (search: $search, type: ANIME) {
        id
        idMal
      }
    }
  `;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Zenox/1.0",
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(ANILIST_CONFIG.API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables: { search: clean } }),
    });

    if (!res.ok) {
      // Fallback: If AniList search is unavailable, try to resolve via MAL ID
      const malId = await resolveMalId(title);
      if (malId) {
        // Query AniList by MAL ID
        const malQuery = `
          query ($idMal: Int) {
            Media (idMal: $idMal, type: ANIME) {
              id
            }
          }
        `;
        const res2 = await fetch(ANILIST_CONFIG.API_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({ query: malQuery, variables: { idMal: malId } }),
        });
        if (res2.ok) {
          const json2 = await res2.json();
          const foundId = json2?.data?.Media?.id ?? null;
          anilistIdCache.set(cacheKey, foundId);
          return foundId;
        }
      }
      anilistIdCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    const id = data?.data?.Media?.id ?? null;
    anilistIdCache.set(cacheKey, id);
    return id;
  } catch {
    anilistIdCache.set(cacheKey, null);
    return null;
  }
}
