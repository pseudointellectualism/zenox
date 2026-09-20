import { NextRequest, NextResponse } from "next/server";
import { getAggregatedSubtitles } from "@/lib/subtitles/service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get("tmdbId");
    const mediaType = searchParams.get("mediaType") as "movie" | "tv";
    const seasonStr = searchParams.get("season");
    const episodeStr = searchParams.get("episode");
    const imdbId = searchParams.get("imdbId") || undefined;

    if (!tmdbId || !mediaType) {
      return NextResponse.json(
        { error: "Missing required query parameter tmdbId or mediaType" },
        { status: 400 },
      );
    }

    const season = seasonStr ? parseInt(seasonStr, 10) : undefined;
    const episode = episodeStr ? parseInt(episodeStr, 10) : undefined;

    const subtitles = await getAggregatedSubtitles({
      tmdbId,
      mediaType,
      season,
      episode,
      imdbId,
    });

    return NextResponse.json(
      { success: true, count: subtitles.length, subtitles },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error: any) {
    console.error("[SubtitlesAPI] Error fetching subtitles:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch subtitles", subtitles: [] },
      { status: 500 },
    );
  }
}
