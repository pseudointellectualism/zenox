import { NextRequest, NextResponse } from "next/server";
import {
  mintStreamToken,
  validateStreamRequest,
  extractClientIp,
} from "@/lib/server/streamSecurity";

export async function POST(req: NextRequest) {
  try {
    // 1. Strict Referer and Origin validation
    const check = validateStreamRequest(req.headers);
    if (!check.allowed) {
      return NextResponse.json(
        { error: "Forbidden", message: check.reason },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { mediaId, mediaType, season, episode, serverIndex, title, year, imdbId } = body;

    if (!mediaId || !mediaType) {
      return NextResponse.json(
        { success: false, error: "Missing required media identifier" },
        { status: 400 },
      );
    }

    if (mediaType !== "movie" && mediaType !== "tv") {
      return NextResponse.json(
        { success: false, error: "Invalid mediaType" },
        { status: 400 },
      );
    }

    // Extract client IP for token fingerprinting
    const clientIp = extractClientIp(req.headers);

    // Mint short-lived AES-256-GCM token (180s)
    const token = mintStreamToken(
      {
        mediaId,
        mediaType,
        season: season ? Number(season) : undefined,
        episode: episode ? Number(episode) : undefined,
        serverIndex: typeof serverIndex === "number" ? serverIndex : 0,
        title: typeof title === "string" ? title : undefined,
        year: year ? String(year) : undefined,
        imdbId: typeof imdbId === "string" ? imdbId : undefined,
      },
      clientIp,
      180,
    );

    return NextResponse.json(
      {
        success: true,
        streamUrl: `/api/v1/stream/${token}`,
        expiresIn: 180,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to initialize playback session" },
      { status: 500 },
    );
  }
}
