// Download server types and logic ported from Basement2
export interface DownloadLink {
  source: string;
  title: string;
  url: string;
  proxiedUrl: string;
  quality: string;
  size: string | null;
  filename: string;
  container?: string;
  details?: string[];
}

export interface DownloadResponse {
  tmdbId: string;
  mediaType: "movie" | "tv";
  season: number | null;
  episode: number | null;
  title: string;
  year: number | null;
  count: number;
  high: DownloadLink | null;
  medium: DownloadLink | null;
  low: DownloadLink | null;
  links: DownloadLink[];
}

const SERVER_ONE_BULK_PROXY = "https://p.111477.xyz/bulk";
const SERVER_ONE_BULK_PROXY_HOST = "p.111477.xyz";
const SERVER_ONE_CONTENT_HOSTS = new Set(["a.111477.xyz"]);

function stripCloudflareChallenge(url: URL) {
  url.searchParams.delete("__cf_chl_tk");
  return url;
}

function makeServerOneBulkUrl(rawUrl: string) {
  try {
    const parsed = stripCloudflareChallenge(new URL(rawUrl));
    const proxied = new URL(SERVER_ONE_BULK_PROXY);
    proxied.searchParams.set("u", parsed.toString());
    return proxied.toString();
  } catch {
    return rawUrl;
  }
}

function getServerOneDirectUrl(link: DownloadLink): string {
  try {
    const proxied = new URL(link.proxiedUrl);
    if (
      proxied.hostname === SERVER_ONE_BULK_PROXY_HOST &&
      proxied.pathname === "/bulk"
    ) {
      const bulkUrl = proxied.searchParams.get("u");
      if (bulkUrl) {
        const nested = new URL(bulkUrl);
        if (SERVER_ONE_CONTENT_HOSTS.has(nested.hostname)) {
          return stripCloudflareChallenge(nested).toString();
        }
      }
    }

    const nestedUrl = proxied.searchParams.get("url");
    if (nestedUrl) {
      const nested = new URL(nestedUrl);
      if (SERVER_ONE_CONTENT_HOSTS.has(nested.hostname)) {
        return stripCloudflareChallenge(nested).toString();
      }
    }
  } catch {
    // Fall back to link.url below.
  }

  return link.url;
}

function normalizeServerOneLink(link: DownloadLink): DownloadLink {
  const directUrl = getServerOneDirectUrl(link);
  try {
    const parsed = new URL(directUrl);
    if (!SERVER_ONE_CONTENT_HOSTS.has(parsed.hostname)) return link;
    try {
      const currentProxied = new URL(link.proxiedUrl);
      if (
        currentProxied.hostname === SERVER_ONE_BULK_PROXY_HOST &&
        currentProxied.pathname === "/bulk"
      ) {
        return {
          ...link,
          url: stripCloudflareChallenge(parsed).toString(),
          proxiedUrl: currentProxied.toString(),
        };
      }
    } catch {
      // Rebuild the Server 1 bulk URL below.
    }
    return {
      ...link,
      url: stripCloudflareChallenge(parsed).toString(),
      proxiedUrl: makeServerOneBulkUrl(parsed.toString()),
    };
  } catch {
    return link;
  }
}

function normalizeServerOneResponse(
  response: DownloadResponse,
): DownloadResponse {
  const links = (response.links || []).map(normalizeServerOneLink);
  return {
    ...response,
    links,
    high: response.high ? normalizeServerOneLink(response.high) : null,
    medium: response.medium ? normalizeServerOneLink(response.medium) : null,
    low: response.low ? normalizeServerOneLink(response.low) : null,
  };
}

export const SERVER_ONE_BASE_URL =
  "https://basement-proxy-server-1.irlodem27.workers.dev";

export async function fetchServerOneDownloads(meta: {
  tmdbId: string | number;
  type?: "movie" | "tv";
  season?: number | null;
  episode?: number | null;
}): Promise<DownloadResponse> {
  const params = new URLSearchParams({
    type: meta.type === "tv" ? "tv" : "movie",
  });

  if (meta.type === "tv") {
    if (meta.season != null && meta.episode != null) {
      params.set("season", meta.season.toString());
      params.set("episode", meta.episode.toString());
    }
  }

  const response = await fetch(
    `${SERVER_ONE_BASE_URL}/api/links/${meta.tmdbId}?${params.toString()}`,
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? "Server 1 could not fetch downloads.");
  }
  return normalizeServerOneResponse(body as DownloadResponse);
}

const COUNTRY_TAGS: Array<[RegExp, string]> = [
  [/(^|[.\s_-])(germ|german|germany)([.\s_-]|$)/i, "Germany"],
  [/(^|[.\s_-])(french|france)([.\s_-]|$)/i, "France"],
  [/(^|[.\s_-])(spanish|spain)([.\s_-]|$)/i, "Spain"],
  [/(^|[.\s_-])(italian|italy)([.\s_-]|$)/i, "Italy"],
  [/(^|[.\s_-])(dutch|netherlands)([.\s_-]|$)/i, "Netherlands"],
  [/(^|[.\s_-])(portuguese|portugal)([.\s_-]|$)/i, "Portugal"],
  [/(^|[.\s_-])(polish|poland)([.\s_-]|$)/i, "Poland"],
  [/(^|[.\s_-])(swedish|sweden)([.\s_-]|$)/i, "Sweden"],
  [/(^|[.\s_-])(norwegian|norway)([.\s_-]|$)/i, "Norway"],
  [/(^|[.\s_-])(danish|denmark)([.\s_-]|$)/i, "Denmark"],
  [/(^|[.\s_-])(finnish|finland)([.\s_-]|$)/i, "Finland"],
  [/(^|[.\s_-])(japanese|japan)([.\s_-]|$)/i, "Japan"],
  [/(^|[.\s_-])(korean|korea)([.\s_-]|$)/i, "Korea"],
];

export function extractDetailTags(link: DownloadLink): string[] {
  const tags = [
    link.container?.toUpperCase(),
    ...COUNTRY_TAGS.filter(([pattern]) => pattern.test(link.filename)).map(
      ([, label]) => label,
    ),
    ...(link.details ?? []),
  ].filter(Boolean) as string[];

  return Array.from(new Set(tags));
}
