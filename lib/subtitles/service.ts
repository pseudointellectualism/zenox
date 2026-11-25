import type { RawExternalSubtitle, SubtitleOption } from "./types";

// Supplied by the operator through WYZIE_API_KEY. No key is compiled in, so an
// unset value simply leaves this provider unconfigured.
const WYZIE_KEY = process.env.WYZIE_API_KEY || "";
const WYZIE_BASE = "https://sub.wyzie.io";
const MEOWTV_BASE = "https://api.meowtv.ru/subs";
const VDRK_BASE = "https://sub.vdrk.site/v1";
const META_BASE = "https://db.speedracelight.com/3";

// Simple in-memory cache for fast repeat lookups (TTL 1 hour)
const cache = new Map<string, { timestamp: number; data: SubtitleOption[] }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

interface FetchSubtitleParams {
  tmdbId: string | number;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  imdbId?: string;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function resolveImdbId(tmdbId: string | number, mediaType: "movie" | "tv"): Promise<string | null> {
  try {
    const url = `${META_BASE}/${mediaType}/${tmdbId}?append_to_response=external_ids`;
    const res = await fetchWithTimeout(url, {}, 4000);
    if (!res.ok) return null;
    const json = await res.json();
    return json.imdb_id || json.external_ids?.imdb_id || null;
  } catch {
    return null;
  }
}

// 1. MeowTV / RezeSubs Provider
async function fetchMeowTvSubs(params: FetchSubtitleParams): Promise<RawExternalSubtitle[]> {
  try {
    const path =
      params.mediaType === "movie"
        ? `${MEOWTV_BASE}/movie/${params.tmdbId}`
        : `${MEOWTV_BASE}/tv/${params.tmdbId}/${params.season || 1}/${params.episode || 1}`;

    const res = await fetchWithTimeout(
      path,
      {
        headers: {
          Accept: "application/json, text/plain, */*",
          Origin: "https://meowtv.ru",
          Referer: "https://meowtv.ru/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        },
      },
      5000,
    );

    if (!res.ok) return [];
    const body = await res.json();
    const list = Array.isArray(body) ? body : body.subtitles || body.captions || [];

    return list
      .filter((item: any) => item.file || item.url)
      .map((item: any, idx: number) => {
        const file = item.file || item.url;
        const rawLabel = item.label || item.language || item.name || "Unknown";
        const isHearingImpaired =
          rawLabel.toLowerCase().includes("hi") ||
          rawLabel.toLowerCase().includes("sdh") ||
          rawLabel.toLowerCase().includes("[cc]");

        return {
          id: `meowtv-${idx}-${file}`,
          url: file,
          language: rawLabel.split(/\s+/)[0],
          display: rawLabel,
          label: rawLabel,
          source: "meowtv",
          type: file.toLowerCase().endsWith(".srt") ? "srt" : "vtt",
          isHearingImpaired,
        };
      });
  } catch {
    return [];
  }
}

// 2. Wyzie Subs Provider
async function fetchWyzieSubs(params: FetchSubtitleParams): Promise<RawExternalSubtitle[]> {
  // Sitting this one out is better than asking with an empty key: the other
  // providers below still answer, so subtitles degrade rather than break.
  if (!WYZIE_KEY) return [];

  try {
    const url = new URL(`${WYZIE_BASE}/search`);
    url.searchParams.set("id", String(params.tmdbId || params.imdbId));
    url.searchParams.set("encoding", "utf-8");
    url.searchParams.set("source", "all");
    url.searchParams.set("key", WYZIE_KEY);

    if (params.mediaType === "tv" && params.season && params.episode) {
      url.searchParams.set("season", String(params.season));
      url.searchParams.set("episode", String(params.episode));
    }

    const res = await fetchWithTimeout(url.toString(), {}, 6000);
    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];

    return list
      .filter((item: any) => item.url)
      .map((item: any, idx: number) => {
        const lang = item.language || item.display || "Unknown";
        const format = (item.format || "").toLowerCase() === "srt" ? "srt" : "vtt";
        const rawSource = (item.source || "").toLowerCase();
        const source = rawSource.includes("opensub") ? "opensubs" : "wyzie";

        return {
          id: item.id || `wyzie-${idx}`,
          url: item.url,
          language: lang,
          display: item.display || lang,
          label: item.display || lang,
          source,
          type: format,
          isHearingImpaired: Boolean(item.isHearingImpaired),
        };
      });
  } catch {
    return [];
  }
}

// 3. VDRK / Granite Provider
async function fetchVdrkSubs(params: FetchSubtitleParams): Promise<RawExternalSubtitle[]> {
  try {
    const path =
      params.mediaType === "movie"
        ? `${VDRK_BASE}/movie/${params.tmdbId}`
        : `${VDRK_BASE}/tv/${params.tmdbId}/${params.season || 1}/${params.episode || 1}`;

    const res = await fetchWithTimeout(path, {}, 5000);
    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];

    return list
      .filter((item: any) => item.file && item.label)
      .map((item: any, idx: number) => {
        const label = item.label;
        const isHearingImpaired = label.includes(" Hi") || label.includes("Hi");
        const cleanLang = label.replace(/\s*Hi\d*$/i, "").replace(/\d+$/, "").trim();

        return {
          id: `granite-${idx}-${item.file}`,
          url: item.file,
          language: cleanLang,
          display: label,
          label: label,
          source: "granite",
          type: "vtt",
          isHearingImpaired,
        };
      });
  } catch {
    return [];
  }
}

// 4. OpenSubtitles Provider
async function fetchOpenSubtitles(params: FetchSubtitleParams, imdbId: string): Promise<RawExternalSubtitle[]> {
  try {
    const cleanImdb = imdbId.replace(/^tt/, "");
    const path =
      params.mediaType === "tv" && params.season && params.episode
        ? `https://rest.opensubtitles.org/search/episode-${params.episode}/imdbid-${cleanImdb}/season-${params.season}`
        : `https://rest.opensubtitles.org/search/imdbid-${cleanImdb}`;

    const res = await fetchWithTimeout(
      path,
      {
        headers: { "X-User-Agent": "VLSub 0.10.2" },
      },
      5000,
    );

    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];

    return list
      .filter((item: any) => item.SubDownloadLink)
      .map((item: any, idx: number) => {
        const url = item.SubDownloadLink.replace(".gz", "").replace("download/", "download/subencoding-utf8/");
        const lang = item.LanguageName || "Unknown";

        return {
          id: `opensubs-${idx}-${cleanImdb}`,
          url,
          language: lang,
          display: lang,
          label: lang,
          source: "opensubs",
          type: (item.SubFormat || "srt").toLowerCase() === "vtt" ? "vtt" : "srt",
          isHearingImpaired: false,
        };
      });
  } catch {
    return [];
  }
}

export async function getAggregatedSubtitles(params: FetchSubtitleParams): Promise<SubtitleOption[]> {
  const cacheKey = `${params.mediaType}-${params.tmdbId}-${params.season || 0}-${params.episode || 0}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Resolve IMDB ID in parallel if not passed
  let imdbId = params.imdbId;
  if (!imdbId) {
    imdbId = (await resolveImdbId(params.tmdbId, params.mediaType)) || undefined;
  }

  const queries = [
    fetchMeowTvSubs(params),
    fetchWyzieSubs({ ...params, imdbId }),
    fetchVdrkSubs(params),
    imdbId ? fetchOpenSubtitles(params, imdbId) : Promise.resolve([]),
  ];

  const results = await Promise.allSettled(queries);
  const rawSubs: RawExternalSubtitle[] = [];

  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      rawSubs.push(...r.value);
    }
  }

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueRaw: RawExternalSubtitle[] = [];

  for (const sub of rawSubs) {
    if (!sub.url || seenUrls.has(sub.url)) continue;
    seenUrls.add(sub.url);
    uniqueRaw.push(sub);
  }

  // Map to numeric indexed SubtitleOption
  const options: SubtitleOption[] = uniqueRaw.map((sub, idx) => {
    const rawLabel = sub.display || sub.label || sub.language || "Unknown";
    return {
      id: idx + 1, // 1-indexed positive numbers (0 / -1 reserved for off)
      label: rawLabel,
      lang: sub.language || "en",
      src: sub.url,
      source: sub.source,
      type: sub.type || "vtt",
      isHearingImpaired: sub.isHearingImpaired,
    };
  });

  cache.set(cacheKey, { timestamp: Date.now(), data: options });
  return options;
}
