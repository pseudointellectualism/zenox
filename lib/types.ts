export type MediaType = "movie" | "tv";

export interface Genre {
  id: number;
  name: string;
}

/** Normalised shape every catalog surface renders. */
export interface MediaSummary {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
  genreIds: number[];
  /** Present on TMDB list payloads for the homepage billboard ordering. */
  popularity?: number;
  /** High-resolution transparent title logo art from TMDB. */
  logoPath?: string | null;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface Episode {
  id: number;
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  overview: string;
  stillPath: string | null;
  runtime: number | null;
  airDate: string | null;
  voteAverage: number;
}

export interface Season {
  id: number;
  seasonNumber: number;
  name: string;
  episodeCount: number;
  posterPath: string | null;
  airDate: string | null;
  episodes?: Episode[];
}

export interface MediaDetails extends MediaSummary {
  tagline: string | null;
  runtime: number | null;
  genres: Genre[];
  status: string | null;
  originalLanguage: string | null;
  cast: CastMember[];
  /** TV only. */
  seasons: Season[];
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  /** Filled from TMDB `recommendations` when available. */
  related: MediaSummary[];
  trailerKey?: string | null;
  imdbId?: string | null;
  releaseYear?: string | null;
  streamingBrand?: {
    id: string;
    name: string;
    bannerUrl: string;
    invertOnDark?: boolean;
  } | null;
}

export interface WatchProvider {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface CatalogQuery {
  type: MediaType;
  genreId?: number;
  providerId?: number;
  yearFrom?: number;
  yearTo?: number;
  sort?: "popularity" | "rating" | "newest";
  page?: number;
}

export interface CatalogPage {
  results: MediaSummary[];
  page: number;
  totalPages: number;
  totalResults: number;
}
