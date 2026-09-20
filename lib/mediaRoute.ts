import type { MediaType } from "./types";

export interface ParsedMediaSlug {
  mediaType: MediaType;
  id: number;
  season?: number;
  episode?: number;
  suffix?: string;
}

/**
 * Builds a clean, expressive watch URL.
 * Examples:
 * - Movie: /?watch=movie-1386315
 * - TV: /?watch=series-108978-5-1
 */
export function buildMediaWatchUrl(
  type: MediaType,
  id: number | string,
  season?: number,
  episode?: number,
  _suffix?: string,
): string {
  if (type === "tv") {
    const s = season || 1;
    const ep = episode || 1;
    return `/media/series-${id}-${s}-${ep}`;
  }
  return `/media/movie-${id}`;
}

/**
 * Builds a clean details / media URL.
 * Examples:
 * - Movie: /?media=movie-1386315
 * - TV: /?media=series-108978-5-1 or /?media=series-108978
 */
export function buildMediaDetailUrl(
  type: MediaType,
  id: number | string,
  season?: number,
  episode?: number,
): string {
  if (type === "tv") {
    if (season && episode) {
      return `/?media=series-${id}-${season}-${episode}`;
    }
    return `/?media=series-${id}`;
  }
  return `/?media=movie-${id}`;
}

/**
 * Parses a media slug into structured mediaType, id, season, and episode.
 * Supported patterns:
 * - series-108978-5-1
 * - series-108978
 * - movie-1386315
 * - tmdb-tv-124364-s1-e2-swapped
 * - tmdb-movie-1007757-swapped
 * - tv-124364
 */
export function parseMediaSlug(slug: string): ParsedMediaSlug | null {
  if (!slug) return null;

  // Check for series-{id}-{season}-{episode}
  const seriesEpMatch = slug.match(/^series-(\d+)-(\d+)-(\d+)$/);
  if (seriesEpMatch) {
    return {
      mediaType: "tv",
      id: parseInt(seriesEpMatch[1], 10),
      season: parseInt(seriesEpMatch[2], 10),
      episode: parseInt(seriesEpMatch[3], 10),
    };
  }

  // Check for series-{id}
  const seriesMatch = slug.match(/^series-(\d+)$/);
  if (seriesMatch) {
    return {
      mediaType: "tv",
      id: parseInt(seriesMatch[1], 10),
      season: 1,
      episode: 1,
    };
  }

  // Check for movie-{id}
  const movieMatch = slug.match(/^movie-(\d+)$/);
  if (movieMatch) {
    return {
      mediaType: "movie",
      id: parseInt(movieMatch[1], 10),
    };
  }

  // Legacy & tmdb format: tmdb-(movie|tv)-(\d+)(-s\d+-e\d+)?(-suffix)?
  const legacyMatch = slug.match(
    /(?:tmdb-)?(movie|tv)-(\d+)(?:-s(\d+)-e(\d+))?(?:-([a-zA-Z0-9_-]+))?/,
  );

  if (!legacyMatch) return null;

  const [, mediaTypeStr, idStr, seasonStr, episodeStr, suffix] = legacyMatch;
  const mediaType: MediaType = mediaTypeStr === "tv" ? "tv" : "movie";
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return null;

  const season = seasonStr ? parseInt(seasonStr, 10) : undefined;
  const episode = episodeStr ? parseInt(episodeStr, 10) : undefined;

  return {
    mediaType,
    id,
    season,
    episode,
    suffix,
  };
}
