import type { MediaType } from "@/lib/types";

export interface StellarMediaRequest {
  tmdbId: string | number;
  type: MediaType;
  season?: number;
  episode?: number;
}

export interface StellarStreamResponse {
  found: boolean;
  url?: string;
  format?: string;
  source?: string;
  availableSources?: string[];
  error?: string;
}

const STELLAR_API = "https://stellar.maybeoneday.ch";

export async function resolveStellarStream(
  request: StellarMediaRequest,
): Promise<StellarStreamResponse> {
  try {
    const params = new URLSearchParams({
      tmdbId: String(request.tmdbId),
      type: request.type === "tv" ? "tv" : "movie",
    });

    if (request.type === "tv") {
      params.append("season", String(request.season ?? 1));
      params.append("episode", String(request.episode ?? 1));
    }

    const response = await fetch(`${STELLAR_API}/resolve?${params}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        found: false,
        error: errorData.error || `Stellar API returned ${response.status}`,
      };
    }

    const data: StellarStreamResponse = await response.json();
    return data;
  } catch (error) {
    console.error("[Stellar] Resolution failed:", error);
    return {
      found: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
