import type {
  Episode,
  Genre,
  MediaDetails,
  MediaSummary,
  MediaType,
  Season,
  WatchProvider,
} from "./types";

/**
 * Fallback catalog used whenever TMDB_API_KEY is absent, so the app builds,
 * renders and demos with no network access. Titles and synopses here are
 * original placeholder content, not real catalog metadata.
 */

export const MOVIE_GENRES: Genre[] = [
  { id: 28, name: "Action" }, { id: 12, name: "Adventure" }, { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" }, { id: 80, name: "Crime" }, { id: 18, name: "Drama" },
  { id: 14, name: "Fantasy" }, { id: 27, name: "Horror" }, { id: 9648, name: "Mystery" },
  { id: 878, name: "Sci-Fi" }, { id: 53, name: "Thriller" }, { id: 10752, name: "War" },
];

export const TV_GENRES: Genre[] = [
  { id: 10759, name: "Action & Adventure" }, { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" }, { id: 80, name: "Crime" }, { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" }, { id: 9648, name: "Mystery" },
  { id: 10765, name: "Sci-Fi & Fantasy" }, { id: 10768, name: "War & Politics" },
];

interface Seed {
  title: string;
  overview: string;
  date: string;
  vote: number;
  genres: number[];
  runtime?: number;
  seasons?: number;
}

const MOVIE_SEEDS: Seed[] = [
  { title: "Harbour of Ash", overview: "A dock foreman discovers the freight manifests he signs every night are moving something that was never meant to leave the island.", date: "2025-11-14", vote: 8.4, genres: [53, 18, 9648], runtime: 128 },
  { title: "Ninety Degrees North", overview: "Two rival cartographers race to chart a shifting polar shelf before the survey window, and their fuel, runs out.", date: "2025-08-02", vote: 7.9, genres: [12, 18], runtime: 141 },
  { title: "The Quiet Multiplier", overview: "A number theorist is recruited to break a cipher that appears to be predicting the messages it encodes.", date: "2024-06-21", vote: 8.1, genres: [878, 53], runtime: 117 },
  { title: "Copper Wren", overview: "A luthier returns to her flooded hometown to recover an instrument that survived three generations of the family that abandoned it.", date: "2025-03-08", vote: 7.6, genres: [18], runtime: 106 },
  { title: "Static Bloom", overview: "Radio silence over a valley research station turns out to be the loudest signal anyone there has ever recorded.", date: "2025-09-26", vote: 7.4, genres: [27, 9648, 878], runtime: 99 },
  { title: "Fifteen Winters", overview: "A retired courier retraces a delivery route he abandoned mid-journey, and finds the parcel still waiting.", date: "2023-12-01", vote: 8.6, genres: [18, 9648], runtime: 134 },
  { title: "Marrowlight", overview: "In a city lit entirely by bioluminescent fungus, a lamplighter guild discovers the glow is being farmed from something alive.", date: "2025-10-31", vote: 8.0, genres: [14, 878], runtime: 122 },
  { title: "Double Blind Sunday", overview: "A pharmaceutical trial placebo group starts reporting side effects, and the coordinator has forty hours to find out why.", date: "2024-04-19", vote: 7.7, genres: [53, 18], runtime: 111 },
  { title: "The Understudy Protocol", overview: "A stage actress hired to impersonate a diplomat wife realises the role has no scheduled final performance.", date: "2025-01-17", vote: 7.5, genres: [53, 80], runtime: 118 },
  { title: "Grainfall", overview: "An agricultural drone pilot in a failing wheat belt starts flying night routes for people who pay in seed.", date: "2024-09-13", vote: 7.2, genres: [18, 80], runtime: 103 },
  { title: "Orbital Debt", overview: "A salvage crew clearing dead satellites finds one that is still transmitting invoices.", date: "2025-07-04", vote: 8.2, genres: [878, 28], runtime: 129 },
  { title: "Paper Lanterns, Falling", overview: "Three siblings meet once a year at a festival to renegotiate a promise none of them wants to keep.", date: "2023-08-11", vote: 8.3, genres: [18], runtime: 124 },
  { title: "The Bellringer Alibi", overview: "A village only witness to a murder was, at the time, forty metres up a tower with both hands on a rope.", date: "2024-11-08", vote: 7.8, genres: [9648, 80], runtime: 108 },
  { title: "Kiln", overview: "A ceramicist kiln keeps firing pieces she has no memory of throwing.", date: "2025-05-23", vote: 7.1, genres: [27, 18], runtime: 94 },
  { title: "Second Language", overview: "An interpreter at a fraught trade summit starts translating what the delegates mean instead of what they say.", date: "2024-02-16", vote: 8.0, genres: [18, 35], runtime: 112 },
  { title: "Anvil Season", overview: "A storm-chasing team funded by an insurance firm is asked to steer, not just study, the next supercell.", date: "2025-06-13", vote: 7.3, genres: [28, 53], runtime: 116 },
  { title: "The Long Green Line", overview: "A border surveyor walks 900 kilometres of a disputed frontier, and every village he reaches has redrawn it.", date: "2023-10-06", vote: 8.5, genres: [18, 10752], runtime: 147 },
  { title: "Tin Ear", overview: "A washed-up session drummer takes a job scoring a silent film that no one can find a print of.", date: "2025-02-28", vote: 7.6, genres: [35, 18], runtime: 101 },
];

const TV_SEEDS: Seed[] = [
  { title: "Ledger", overview: "A forensic accountant is embedded in a shipping conglomerate, and the fraud she was sent to find is the least of it.", date: "2025-04-10", vote: 8.7, genres: [80, 18], seasons: 3 },
  { title: "Nightshift Cartography", overview: "The last analogue mapping office in the country charts places that keep failing to exist by morning.", date: "2024-10-02", vote: 8.4, genres: [9648, 10765], seasons: 2 },
  { title: "The Fifth Quarter", overview: "A relegation-threatened football club is bought by a data syndicate with a strange definition of winning.", date: "2025-08-21", vote: 7.9, genres: [18, 35], seasons: 2 },
  { title: "Cold Open", overview: "Behind the scenes of a live late-night broadcast where the writers keep predicting the news.", date: "2024-03-14", vote: 8.1, genres: [35, 9648], seasons: 4 },
  { title: "Tidewatch", overview: "A coastal rescue station logs everything that washes ashore, including the things that walk back out.", date: "2025-09-05", vote: 8.3, genres: [10765, 18], seasons: 1 },
  { title: "Provisional Government", overview: "Six months of an interim cabinet that was only ever meant to last three weeks.", date: "2023-11-19", vote: 8.8, genres: [10768, 18], seasons: 3 },
  { title: "Understory", overview: "A field biology crew in old-growth forest documents a canopy ecosystem that is documenting them back.", date: "2025-01-30", vote: 7.7, genres: [99, 10765], seasons: 2 },
  { title: "The Commissioning", overview: "An engineering team signs off a new power station, one interlock at a time, against a deadline nobody set.", date: "2024-07-07", vote: 8.0, genres: [18, 53], seasons: 1 },
  { title: "Rota", overview: "Twelve-hour shifts at a rural ambulance depot, told in the gaps between the calls.", date: "2025-05-16", vote: 8.5, genres: [18], seasons: 5 },
  { title: "Signal Hill", overview: "A relay station operator between two silent nations decides what gets passed along.", date: "2024-12-11", vote: 8.2, genres: [10768, 9648], seasons: 2 },
  { title: "Practical Effects", overview: "A workshop of animatronic builders keeps the craft alive as the industry stops asking for it.", date: "2023-09-22", vote: 7.8, genres: [35, 18], seasons: 3 },
  { title: "The Inventory", overview: "A museum uncatalogued basement, one artefact per episode, and a curator running out of time.", date: "2025-10-08", vote: 8.6, genres: [9648, 99], seasons: 2 },
  { title: "Downdraft", overview: "A wildfire hotshot crew season, from the first briefing to the last containment line.", date: "2024-05-29", vote: 8.4, genres: [10759, 18], seasons: 3 },
  { title: "Quorum", overview: "A generation ship council must reach unanimity on a course change, and there are nine of them.", date: "2025-07-18", vote: 8.1, genres: [10765, 18], seasons: 1 },
];

function toSummary(seed: Seed, index: number, mediaType: MediaType): MediaSummary {
  return {
    id: (mediaType === "movie" ? 90000 : 95000) + index,
    mediaType,
    title: seed.title,
    overview: seed.overview,
    posterPath: null,
    backdropPath: null,
    releaseDate: seed.date,
    voteAverage: seed.vote,
    genreIds: seed.genres,
    popularity: 1000 - index * 17,
  };
}

export const MOCK_MOVIES: MediaSummary[] = MOVIE_SEEDS.map((s, i) => toSummary(s, i, "movie"));
export const MOCK_TV: MediaSummary[] = TV_SEEDS.map((s, i) => toSummary(s, i, "tv"));

const SEED_BY_ID = new Map<string, Seed>([
  ...MOVIE_SEEDS.map((s, i) => [`movie:${90000 + i}`, s] as const),
  ...TV_SEEDS.map((s, i) => [`tv:${95000 + i}`, s] as const),
]);

const CAST_NAMES = [
  "Imani Okafor", "Petra Lindqvist", "Dawud El-Hajj", "Noa Ben-Ami", "Kwame Boateng",
  "Yuki Nakamura", "Rosalind Achebe", "Tomas Iglesias", "Mira Kovac", "Elif Dogan",
];

const ROLE_NAMES = [
  "Vaughn", "The Registrar", "Adaeze", "Captain Ferrer", "Dr. Halvorsen",
  "Sami", "The Understudy", "Marguerite", "Oyelaran", "Ines",
];

export function mockDetails(type: MediaType, id: string): MediaDetails {
  const pool = type === "movie" ? MOCK_MOVIES : MOCK_TV;
  const base = pool.find((m) => String(m.id) === id) ?? pool[0];
  const seed = SEED_BY_ID.get(`${type}:${base.id}`);
  const genreTable = type === "movie" ? MOVIE_GENRES : TV_GENRES;
  const seasonCount = seed?.seasons ?? 0;

  return {
    ...base,
    tagline: null,
    runtime: seed?.runtime ?? null,
    genres: base.genreIds
      .map((gid) => genreTable.find((g) => g.id === gid))
      .filter((g): g is Genre => Boolean(g)),
    status: type === "movie" ? "Released" : "Returning Series",
    originalLanguage: "en",
    cast: CAST_NAMES.slice(0, 8).map((name, i) => ({
      id: 7000 + i,
      name,
      character: ROLE_NAMES[i % ROLE_NAMES.length],
      profilePath: null,
    })),
    seasons: Array.from({ length: seasonCount }, (_, i) => mockSeason(String(base.id), i + 1, false)),
    numberOfSeasons: seasonCount || null,
    numberOfEpisodes: seasonCount ? seasonCount * 8 : null,
    related: pool.filter((m) => m.id !== base.id).slice(0, 12),
  };
}

export function mockSeason(tvId: string, seasonNumber: number, withEpisodes = true): Season {
  const numeric = Number(tvId) || 95000;
  const episodes: Episode[] = Array.from({ length: 8 }, (_, i) => ({
    id: numeric * 100 + seasonNumber * 10 + i,
    episodeNumber: i + 1,
    seasonNumber,
    name: `Episode ${i + 1}`,
    overview:
      "Placeholder episode synopsis served from the offline catalog. Connect a TMDB API key to load real episode metadata.",
    stillPath: null,
    runtime: 42 + ((i * 7) % 17),
    airDate: `2025-0${Math.min(9, seasonNumber)}-${String(3 + i * 3).padStart(2, "0")}`,
    voteAverage: 7 + ((i * 3) % 20) / 10,
  }));

  return {
    id: numeric * 10 + seasonNumber,
    seasonNumber,
    name: `Season ${seasonNumber}`,
    episodeCount: episodes.length,
    posterPath: null,
    airDate: `2025-0${Math.min(9, seasonNumber)}-03`,
    episodes: withEpisodes ? episodes : undefined,
  };
}

export function mockSearch(query: string): MediaSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return [...MOCK_MOVIES, ...MOCK_TV].filter(
    (m) => m.title.toLowerCase().includes(q) || m.overview.toLowerCase().includes(q),
  );
}

/**
 * Placeholder services for the offline catalog. Invented names, rendered as
 * monogram tiles. Real providers and their logos arrive from TMDB once a key
 * is configured; brand marks are never recreated by hand.
 */
export const MOCK_PROVIDERS: WatchProvider[] = [
  { id: 8, name: "Netflix", logoPath: "/rK1KljqmbvO9HQa1PBFLILWah72.png" },
  { id: 9, name: "Prime Video", logoPath: "/gMZdpavHmxFNnLpMHwVxfqeux2g.png" },
  { id: 337, name: "Disney+", logoPath: "/5eZ872CghnHFLB1j8grszbrx0dx.png" },
  { id: 15, name: "Hulu", logoPath: "/44uAnmSqvA4yBOdbPWN8YgQHjWm.png" },
  { id: 350, name: "Apple TV", logoPath: "/9icYBfYFcwgCbky5VdGUIKJ4C5i.png" },
  { id: 1899, name: "HBO Max", logoPath: "/skypuy7SXuugIQeYg0IglmzoKaS.png" },
  { id: 2303, name: "Paramount+", logoPath: "/4N4BMd0Mm0kHAmF7RZgL5lW3cwc.png" },
  { id: 175, name: "Netflix Kids", logoPath: "/rjPaInWHH1nPgtRFF17BbHN2gu.png" },
];

/** Stable pseudo-assignment so provider tiles filter the offline catalog too. */
export function mockProvidersFor(mediaId: number): number[] {
  const first = MOCK_PROVIDERS[mediaId % MOCK_PROVIDERS.length];
  const second = MOCK_PROVIDERS[(mediaId * 7) % MOCK_PROVIDERS.length];
  return first.id === second.id ? [first.id] : [first.id, second.id];
}
