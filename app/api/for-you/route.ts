import { NextResponse } from "next/server";

import { discover, getRecommendations, getTrending } from "@/lib/tmdb";
import type { MediaSummary, MediaType } from "@/lib/types";

interface Body {
  /** If provided, fetch recommendations directly for this specific watched title */
  mediaId?: number;
  mediaType?: MediaType;
  /** Genre id -> affinity weight, highest first. */
  weights?: Record<string, number>;
  /** `type:id` keys the viewer has already seen, to filter out. */
  exclude?: string[];
}

/**
 * Blends recommendations from a specific watched title or top genres.
 *
 * Runs server-side because TMDB requests must never leave the server, and the
 * affinity weights or selected title arrive from the client because watch history is local.
 */
export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    // An empty body is valid: fall through to the trending cold start.
  }

  const exclude = new Set(body.exclude ?? []);

  // Title-targeted recommendation mode: user selected a specific watched title
  if (body.mediaId && body.mediaType) {
    try {
      const recs = await getRecommendations(body.mediaType, body.mediaId);
      const filtered = recs.filter((m) => !exclude.has(key(m)));
      if (filtered.length >= 6) {
        return NextResponse.json({ results: filtered.slice(0, 20), basis: "title" });
      }
      // If TMDB returns fewer than 6, we keep what was returned and blend below
      if (filtered.length > 0 && !body.weights) {
        return NextResponse.json({ results: filtered.slice(0, 20), basis: "title" });
      }
    } catch {
      // Fall through to genre/trending blend
    }
  }

  const weights = Object.entries(body.weights ?? {})
    .map(([id, weight]) => ({ id: Number(id), weight }))
    .filter((g) => Number.isFinite(g.id) && g.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4);

  // Cold start: nothing watched yet, so trending is the honest answer.
  if (!weights.length) {
    const [movies, shows] = await Promise.all([getTrending("movie", "week"), getTrending("tv", "week")]);
    return NextResponse.json({
      results: interleave([movies, shows]).filter((m) => !exclude.has(key(m))).slice(0, 20),
      basis: "trending",
    });
  }

  const perGenre = await Promise.all(
    weights.flatMap((genre) =>
      (["movie", "tv"] as MediaType[]).map((type) =>
        discover({ type, genreId: genre.id, sort: "rating" }).then((page) =>
          page.results.map((item) => ({ item, weight: genre.weight })),
        ),
      ),
    ),
  );

  // Score by affinity and quality, keeping one entry per title.
  const scored = new Map<string, { item: MediaSummary; score: number }>();
  for (const bucket of perGenre) {
    for (const { item, weight } of bucket) {
      const id = key(item);
      if (exclude.has(id)) continue;
      const score = weight * 2 + item.voteAverage / 10;
      const existing = scored.get(id);
      // A title matching several liked genres accumulates, which is the point.
      if (existing) existing.score += weight;
      else scored.set(id, { item, score });
    }
  }

  const results = [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((entry) => entry.item);

  return NextResponse.json({ results, basis: "affinity" });
}

const key = (m: MediaSummary) => `${m.mediaType}:${m.id}`;

/** Round-robin merge so the first rows are not all one media type. */
function interleave(lists: MediaSummary[][]): MediaSummary[] {
  const out: MediaSummary[] = [];
  const max = Math.max(...lists.map((l) => l.length), 0);
  for (let i = 0; i < max; i++) {
    for (const list of lists) if (list[i]) out.push(list[i]);
  }
  return out;
}
