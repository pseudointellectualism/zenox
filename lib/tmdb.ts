import "server-only";

import {
  MOCK_MOVIES,
  MOCK_TV,
  mockProvidersFor,
  MOVIE_GENRES,
  TV_GENRES,
  mockDetails,
  mockSearch,
  mockSeason,
} from "./mock-data";
import { resolvePrimaryStreamingBrand } from "./streamingBrands";
import type {
  CatalogPage,
  CatalogQuery,
  Genre,
  MediaDetails,
  MediaSummary,
  MediaType,
  Season,
  WatchProvider,
} from "./types";

const BASE = "https://api.themoviedb.org/3";

export const hasApiKey = Boolean(process.env.TMDB_API_KEY);

/** Re-exported so server modules can reach it from the same place as the fetchers. */
export { tmdbImage } from "./tmdb-image";

interface RawListItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  popularity?: number;
}

const BACKDROP_OVERRIDES: Record<number, string> = {
  // Spider-Man: Brand New Day - TMDB's default teaser backdrop is cropped below the eyes.
  // We use the full 4K cinematic action backdrop with full face & mask.
  969681: "/qeQJx07rK2xm8SD2sJxFKhE7gs0.jpg",
};

function normalise(raw: RawListItem, fallbackType: MediaType): MediaSummary {
  const mediaType: MediaType =
    raw.media_type === "movie" || raw.media_type === "tv" ? raw.media_type : fallbackType;
  return {
    id: raw.id,
    mediaType,
    title: raw.title ?? raw.name ?? "Untitled",
    overview: raw.overview ?? "",
    posterPath: raw.poster_path ?? null,
    backdropPath: BACKDROP_OVERRIDES[raw.id] ?? raw.backdrop_path ?? null,
    releaseDate: raw.release_date ?? raw.first_air_date ?? null,
    voteAverage: raw.vote_average ?? 0,
    genreIds: raw.genre_ids ?? [],
    popularity: raw.popularity,
  };
}

async function request<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  revalidate = 3600,
): Promise<T | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;

  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "en-US");
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ lists */

export async function getTrending(
  type: MediaType,
  window: "day" | "week" = "week",
): Promise<MediaSummary[]> {
  const data = await request<{ results: RawListItem[] }>(`/trending/${type}/${window}`, {}, 1800);
  if (!data?.results?.length) return type === "movie" ? MOCK_MOVIES : MOCK_TV;
  return data.results.map((r) => normalise(r, type));
}

export async function getPopular(type: MediaType): Promise<MediaSummary[]> {
  const data = await request<{ results: RawListItem[] }>(`/${type}/popular`);
  if (!data?.results?.length) {
    const pool = type === "movie" ? MOCK_MOVIES : MOCK_TV;
    return [...pool].reverse();
  }
  return data.results.map((r) => normalise(r, type));
}

export async function getTopRated(type: MediaType): Promise<MediaSummary[]> {
  const data = await request<{ results: RawListItem[] }>(`/${type}/top_rated`);
  if (!data?.results?.length) {
    const pool = type === "movie" ? MOCK_MOVIES : MOCK_TV;
    return [...pool].sort((a, b) => b.voteAverage - a.voteAverage);
  }
  return data.results.map((r) => normalise(r, type));
}

export async function getGenres(type: MediaType): Promise<Genre[]> {
  const data = await request<{ genres: Genre[] }>(`/genre/${type}/list`, {}, 86400);
  if (!data?.genres?.length) return type === "movie" ? MOVIE_GENRES : TV_GENRES;
  return data.genres;
}

const SORT_MAP: Record<NonNullable<CatalogQuery["sort"]>, string> = {
  popularity: "popularity.desc",
  rating: "vote_average.desc",
  newest: "primary_release_date.desc",
};

export async function discover(query: CatalogQuery): Promise<CatalogPage> {
  const { type, genreId, providerId, yearFrom, yearTo, sort = "popularity", page = 1 } = query;
  const dateKey = type === "movie" ? "primary_release_date" : "first_air_date";
  const sortBy = type === "tv" && sort === "newest" ? "first_air_date.desc" : SORT_MAP[sort];

  const data = await request<{
    results: RawListItem[];
    page: number;
    total_pages: number;
    total_results: number;
  }>(`/discover/${type}`, {
    page,
    sort_by: sortBy,
    with_genres: genreId,
    with_watch_providers: providerId,
    watch_region: providerId ? "US" : undefined,
    "vote_count.gte": sort === "rating" ? 200 : undefined,
    [`${dateKey}.gte`]: yearFrom ? `${yearFrom}-01-01` : undefined,
    [`${dateKey}.lte`]: yearTo ? `${yearTo}-12-31` : undefined,
  });

  if (!data?.results?.length) return mockCatalogPage(query);

  return {
    results: data.results.map((r) => normalise(r, type)),
    page: data.page,
    totalPages: Math.min(data.total_pages, 500),
    totalResults: data.total_results,
  };
}

function mockCatalogPage(query: CatalogQuery): CatalogPage {
  const { type, genreId, providerId, yearFrom, yearTo, sort = "popularity", page = 1 } = query;
  let pool = [...(type === "movie" ? MOCK_MOVIES : MOCK_TV)];

  if (genreId) pool = pool.filter((m) => m.genreIds.includes(genreId));
  if (providerId) pool = pool.filter((m) => mockProvidersFor(m.id).includes(providerId));
  if (yearFrom) pool = pool.filter((m) => Number(m.releaseDate?.slice(0, 4)) >= yearFrom);
  if (yearTo) pool = pool.filter((m) => Number(m.releaseDate?.slice(0, 4)) <= yearTo);

  if (sort === "rating") pool.sort((a, b) => b.voteAverage - a.voteAverage);
  else if (sort === "newest")
    pool.sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  else pool.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

  const perPage = 12;
  const start = (page - 1) * perPage;
  return {
    results: pool.slice(start, start + perPage),
    page,
    totalPages: Math.max(1, Math.ceil(pool.length / perPage)),
    totalResults: pool.length,
  };
}

/* ---------------------------------------------------------------- details */

interface RawDetails extends RawListItem {
  tagline?: string | null;
  runtime?: number | null;
  episode_run_time?: number[];
  genres?: Genre[];
  status?: string;
  original_language?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: {
    id: number;
    season_number: number;
    name: string;
    episode_count: number;
    poster_path: string | null;
    air_date: string | null;
  }[];
  credits?: {
    cast?: { id: number; name: string; character?: string; profile_path: string | null }[];
  };
  recommendations?: { results: RawListItem[] };
  videos?: { results?: { key: string; site: string; type: string }[] };
  images?: {
    logos?: { file_path: string; iso_639_1?: string | null; vote_average?: number }[];
  };
  networks?: { id: number; name: string; logo_path: string | null }[];
  production_companies?: { id: number; name: string; logo_path: string | null }[];
  "watch/providers"?: {
    results?: Record<
      string,
      {
        flatrate?: { provider_id: number; provider_name: string; logo_path: string }[];
      }
    >;
  };
}

export async function getDetails(type: MediaType, id: string): Promise<MediaDetails> {
  const data = await request<RawDetails>(`/${type}/${id}`, {
    append_to_response: "credits,recommendations,videos,images,watch/providers",
    include_image_language: "en,null",
  });
  if (!data) return mockDetails(type, id);

  const summary = normalise(data, type);
  const trailer =
    data.videos?.results?.find(
      (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
    ) ?? data.videos?.results?.find((v) => v.site === "YouTube");

  // Pick the best logo (prefer English logos sorted by vote_average, fallback to first)
  const enLogos = data.images?.logos?.filter((l) => l.iso_639_1 === "en") ?? [];
  const bestEnLogo = enLogos.length > 0
    ? [...enLogos].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0]
    : null;
  const bestFallbackLogo = data.images?.logos && data.images.logos.length > 0
    ? [...data.images.logos].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0]
    : null;
  const logoPath = (bestEnLogo ?? bestFallbackLogo)?.file_path ?? null;

  // Resolve official streaming brand banner (Netflix, Prime Video, Disney+, Hulu, HBO Max, Apple TV, Paramount+)
  const usFlat = data["watch/providers"]?.results?.US?.flatrate;
  const gbFlat = data["watch/providers"]?.results?.GB?.flatrate;
  const anyFlat = Object.values(data["watch/providers"]?.results || {}).find((r) => r.flatrate)?.flatrate;

  const streamingBrand = resolvePrimaryStreamingBrand({
    networks: data.networks,
    flatrateProviders: usFlat || gbFlat || anyFlat,
    productionCompanies: data.production_companies,
  });

  return {
    ...summary,
    logoPath,
    streamingBrand,
    genreIds: data.genres?.map((g) => g.id) ?? summary.genreIds,
    tagline: data.tagline || null,
    runtime: data.runtime ?? data.episode_run_time?.[0] ?? null,
    genres: data.genres ?? [],
    status: data.status ?? null,
    originalLanguage: data.original_language ?? null,
    trailerKey: trailer?.key ?? null,
    cast:
      data.credits?.cast?.slice(0, 12).map((c) => ({
        id: c.id,
        name: c.name,
        character: c.character ?? "",
        profilePath: c.profile_path,
      })) ?? [],
    seasons:
      data.seasons
        ?.filter((s) => s.season_number > 0)
        .map((s) => ({
          id: s.id,
          seasonNumber: s.season_number,
          name: s.name,
          episodeCount: s.episode_count,
          posterPath: s.poster_path,
          airDate: s.air_date,
        })) ?? [],
    numberOfSeasons: data.number_of_seasons ?? null,
    numberOfEpisodes: data.number_of_episodes ?? null,
    related:
      data.recommendations?.results?.slice(0, 12).map((r) => normalise(r, type)) ?? [],
  };
}

export async function getRecommendations(type: MediaType, id: string | number): Promise<MediaSummary[]> {
  const data = await request<{ results: RawListItem[] }>(`/${type}/${id}/recommendations`, {}, 3600);
  if (data?.results?.length) {
    return data.results.map((r) => normalise(r, type));
  }
  const similar = await request<{ results: RawListItem[] }>(`/${type}/${id}/similar`, {}, 3600);
  if (similar?.results?.length) {
    return similar.results.map((r) => normalise(r, type));
  }
  return [];
}

export async function getSeason(tvId: string, seasonNumber: number): Promise<Season> {
  const data = await request<{
    id: number;
    season_number: number;
    name: string;
    poster_path: string | null;
    air_date: string | null;
    episodes?: {
      id: number;
      episode_number: number;
      season_number: number;
      name: string;
      overview: string;
      still_path: string | null;
      runtime: number | null;
      air_date: string | null;
      vote_average: number;
    }[];
  }>(`/tv/${tvId}/season/${seasonNumber}`);

  if (!data) return mockSeason(tvId, seasonNumber);

  const episodes =
    data.episodes?.map((e) => ({
      id: e.id,
      episodeNumber: e.episode_number,
      seasonNumber: e.season_number,
      name: e.name,
      overview: e.overview,
      stillPath: e.still_path,
      runtime: e.runtime,
      airDate: e.air_date,
      voteAverage: e.vote_average,
    })) ?? [];

  return {
    id: data.id,
    seasonNumber: data.season_number,
    name: data.name,
    episodeCount: episodes.length,
    posterPath: data.poster_path,
    airDate: data.air_date,
    episodes,
  };
}

/* ----------------------------------------------------------------- search */

export async function searchCatalog(query: string): Promise<MediaSummary[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const data = await request<{ results: RawListItem[] }>(
    "/search/multi",
    { query: trimmed, include_adult: "false" },
    600,
  );
  if (!data?.results?.length) return mockSearch(trimmed);

  return data.results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .map((r) => normalise(r, "movie"));
}

/* -------------------------------------------------------------- providers */

export const FEATURED_PROVIDERS: WatchProvider[] = [
  { id: 8, name: "Netflix", logoPath: "/rK1KljqmbvO9HQa1PBFLILWah72.png" },
  { id: 9, name: "Prime Video", logoPath: "/gMZdpavHmxFNnLpMHwVxfqeux2g.png" },
  { id: 337, name: "Disney+", logoPath: "/5eZ872CghnHFLB1j8grszbrx0dx.png" },
  { id: 15, name: "Hulu", logoPath: "/44uAnmSqvA4yBOdbPWN8YgQHjWm.png" },
  { id: 350, name: "Apple TV", logoPath: "/9icYBfYFcwgCbky5VdGUIKJ4C5i.png" },
  { id: 1899, name: "HBO Max", logoPath: "/skypuy7SXuugIQeYg0IglmzoKaS.png" },
  { id: 2303, name: "Paramount+", logoPath: "/4N4BMd0Mm0kHAmF7RZgL5lW3cwc.png" },
];

export const NETFLIX_KIDS_PROVIDER: WatchProvider = {
  id: 175,
  name: "Netflix Kids",
  logoPath: "/rjPaInWHH1nPgtRFF17BbHN2gu.png",
};

export const ALL_CURATED_PROVIDERS: WatchProvider[] = [
  ...FEATURED_PROVIDERS,
  NETFLIX_KIDS_PROVIDER,
];

export async function getWatchProviders(type: MediaType): Promise<WatchProvider[]> {
  const data = await request<{
    results: { provider_id: number; provider_name: string; logo_path: string | null }[];
  }>(`/watch/providers/${type}`, { watch_region: "US" }, 86400);

  const logoMap = new Map<number, string | null>();
  if (data?.results) {
    for (const r of data.results) {
      if (r.logo_path) logoMap.set(r.provider_id, r.logo_path);
    }
  }

  return FEATURED_PROVIDERS.map((p) => ({
    ...p,
    logoPath: logoMap.get(p.id) ?? p.logoPath,
  }));
}

export async function getMediaLogo(type: MediaType, id: string | number): Promise<string | null> {
  const data = await request<{
    logos?: { file_path: string; iso_639_1?: string | null; vote_average?: number }[];
  }>(`/${type}/${id}/images`, {
    include_image_language: "en,null",
  }, 86400);

  const enLogos = data?.logos?.filter((l) => l.iso_639_1 === "en") ?? [];
  const bestEnLogo = enLogos.length > 0
    ? [...enLogos].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0]
    : null;
  const bestFallbackLogo = data?.logos && data.logos.length > 0
    ? [...data.logos].sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))[0]
    : null;

  return (bestEnLogo ?? bestFallbackLogo)?.file_path ?? null;
}

export function getProviderById(id: number): WatchProvider | undefined {
  return ALL_CURATED_PROVIDERS.find((p) => p.id === id);
}
