/**
 * Client-safe image helper. Lives outside lib/tmdb.ts because that module is
 * marked `server-only` and PosterArt renders inside client components.
 */
const IMAGE_BASE = "https://image.tmdb.org/t/p";

export type ImageSize = "w185" | "w342" | "w500" | "w780" | "w1280" | "original";

export function tmdbImage(
  path: string | null | undefined,
  size: ImageSize = "w500",
): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}
