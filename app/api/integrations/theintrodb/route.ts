import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get("tmdb_id");
    const season = searchParams.get("season");
    const episode = searchParams.get("episode");
    const durationMs = searchParams.get("duration_ms");

    if (!tmdbId) {
      return NextResponse.json(
        { error: "tmdb_id is required" },
        { status: 400 },
      );
    }

    const tidbUrl = new URL("https://api.theintrodb.org/v3/media");
    tidbUrl.searchParams.set("tmdb_id", tmdbId);
    if (season) tidbUrl.searchParams.set("season", season);
    if (episode) tidbUrl.searchParams.set("episode", episode);
    if (durationMs) tidbUrl.searchParams.set("duration_ms", durationMs);

    // Forward browser-like headers to pass Cloudflare / TheIntroDB edge checks
    const tidbHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
    };

    const res = await fetch(tidbUrl.toString(), {
      headers: tidbHeaders,
      next: { revalidate: 86400 }, // cache for 24 hours
    });

    if (res.status === 404 || !res.ok) {
      if (!res.ok && res.status !== 404) {
        console.warn(`[TheIntroDB] Upstream returned status ${res.status}`);
      }
      return NextResponse.json(
        {
          tmdb_id: Number(tmdbId),
          intro: [],
          recap: [],
          credits: [],
          preview: [],
          upstreamStatus: res.status,
        },
        {
          status: 200, // Return 200 with empty array so player doesn't crash or throw network errors
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
          },
        },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error) {
    console.error("[TheIntroDB API Error]:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
        intro: [],
        recap: [],
        credits: [],
        preview: [],
      },
      { status: 500 },
    );
  }
}
