import { NextResponse } from "next/server";

import { getDetails, getSeason } from "@/lib/tmdb";
import type { MediaType } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await params;

  if (type !== "movie" && type !== "tv") {
    return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
  }

  try {
    const details = await getDetails(type as MediaType, id);
    const initialSeason =
      type === "tv" && details.seasons.length > 0
        ? await getSeason(id, details.seasons[0].seasonNumber)
        : null;

    return NextResponse.json(
      { details, initialSeason },
      { headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=3600" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to fetch media details" },
      { status: 500 },
    );
  }
}
