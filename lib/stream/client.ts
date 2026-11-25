import type { MediaType } from "@/lib/types";

export interface PlaybackSessionParams {
  mediaId: number | string;
  mediaType: MediaType;
  season?: number;
  episode?: number;
  serverIndex?: number;
  title?: string;
  year?: string | number;
  imdbId?: string;
}

export interface PlaybackSessionResponse {
  success: boolean;
  streamUrl?: string;
  expiresIn?: number;
  error?: string;
}

/**
 * Requests an opaque, encrypted playback session token from our Next.js backend.
 * DevTools Network tab will only ever see:
 * 1. POST /api/v1/playback/session
 * 2. GET /api/v1/stream/z_...
 *
 * No scraper code, provider names, or upstream URLs are ever exposed.
 */
export async function fetchPlaybackSession(
  params: PlaybackSessionParams,
): Promise<string | null> {
  try {
    const res = await fetch("/api/v1/playback/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`[PlaybackSession] Request failed with status ${res.status}`);
      return null;
    }

    const data: PlaybackSessionResponse = await res.json();
    if (data.success && data.streamUrl) {
      return data.streamUrl;
    }

    console.error("[PlaybackSession] Backend returned error:", data.error);
    return null;
  } catch (err) {
    console.error("[PlaybackSession] Network failure:", err);
    return null;
  }
}
