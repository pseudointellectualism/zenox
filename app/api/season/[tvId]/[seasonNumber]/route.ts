import { NextResponse } from "next/server";

import { getSeason } from "@/lib/tmdb";

/** Lets the episode drawer swap seasons without a full navigation. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tvId: string; seasonNumber: string }> },
) {
  const { tvId, seasonNumber } = await params;
  const season = await getSeason(tvId, Number(seasonNumber) || 1);

  return NextResponse.json(
    { season },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
}
