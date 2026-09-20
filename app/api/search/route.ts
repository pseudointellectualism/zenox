import { NextResponse } from "next/server";

import { searchCatalog } from "@/lib/tmdb";

/**
 * Keeps TMDB_API_KEY server-side while still letting the /search client
 * component query on every keystroke.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchCatalog(query);

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
