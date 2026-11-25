import { NextResponse } from "next/server";
import { MAL_CONFIG } from "@/lib/server/integrationsConfig";
import { matchAnimeToTMDB, resolveMalId } from "@/lib/server/animeMatcher";
import type { LibraryEntry, HistoryEntry } from "@/lib/store/useLibraryStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      access_token,
      action,
      anime_id,
      title,
      status,
      num_watched_episodes,
      episode,
      score,
      items,
    } = body;

    if (!access_token) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 });
    }

    const headers = {
      Authorization: `Bearer ${access_token}`,
      "User-Agent": "Zenox/1.0",
    };

    // -------------------------------------------------------------
    // 1. PULL USER'S MAL LIBRARY (Watchlist & Continue Watching)
    // -------------------------------------------------------------
    if (action === "get_library") {
      const malRes = await fetch(
        `${MAL_CONFIG.API_URL}/users/@me/animelist?fields=list_status,num_episodes,alternative_titles,main_picture&limit=500`,
        { headers, cache: "no-store" },
      );

      if (!malRes.ok) {
        return NextResponse.json(
          { error: "Failed to fetch MAL animelist" },
          { status: malRes.status },
        );
      }

      const malData = await malRes.json();
      const rawList = malData?.data || [];

      const watchlist: LibraryEntry[] = [];
      const history: HistoryEntry[] = [];

      // Process in batches of 5 to avoid TMDB rate spikes
      for (const item of rawList) {
        const node = item.node;
        const listStatus = item.list_status;
        if (!node || !listStatus) continue;

        const rawTitle = node.title;
        const englishTitle = node.alternative_titles?.en;
        const statusType = listStatus.status; // watching, completed, on_hold, dropped, plan_to_watch
        const epWatched = listStatus.num_watched_episodes || 0;
        const updatedAt = listStatus.updated_at
          ? new Date(listStatus.updated_at).getTime()
          : Date.now();

        // Match against TMDB catalog
        const tmdb = await matchAnimeToTMDB(rawTitle, {
          englishTitle,
          fallbackImage: node.main_picture?.large || node.main_picture?.medium,
        });

        const baseEntry: LibraryEntry = tmdb
          ? {
              id: tmdb.id,
              mediaType: tmdb.mediaType,
              title: tmdb.title,
              genreIds: tmdb.genreIds ?? [16],
              posterPath: tmdb.posterPath || node.main_picture?.large || node.main_picture?.medium,
              backdropPath: tmdb.backdropPath || null,
              releaseDate: tmdb.releaseDate || null,
              voteAverage: tmdb.voteAverage || 8.0,
              addedAt: updatedAt,
            }
          : {
              id: 8000000 + Number(node.id),
              mediaType: "tv",
              title: englishTitle || rawTitle,
              genreIds: [16],
              posterPath: node.main_picture?.large || node.main_picture?.medium || null,
              backdropPath: null,
              releaseDate: null,
              voteAverage: 8.0,
              addedAt: updatedAt,
            };

        if (statusType === "watching") {
          // Add to Continue Watching (history)
          history.push({
            ...baseEntry,
            progress: 0.5,
            positionSeconds: 720,
            durationSeconds: 1440,
            season: 1,
            episode: Math.max(1, epWatched),
            watchedAt: updatedAt,
          });
        } else if (statusType === "plan_to_watch") {
          // Add to Watchlist / Favorites
          watchlist.push(baseEntry);
        } else if (statusType === "completed") {
          // Add to completed history
          history.push({
            ...baseEntry,
            progress: 1.0,
            positionSeconds: 1440,
            durationSeconds: 1440,
            season: 1,
            episode: Math.max(1, node.num_episodes || epWatched),
            watchedAt: updatedAt,
          });
        }
      }

      return NextResponse.json({
        ok: true,
        watchlist,
        history,
        totalMalItems: rawList.length,
      });
    }

    // -------------------------------------------------------------
    // 2. ADD TO WATCHLIST (plan_to_watch)
    // -------------------------------------------------------------
    if (action === "add_watchlist") {
      let targetId = anime_id;
      if (!targetId && title) {
        targetId = await resolveMalId(title);
      }
      if (!targetId) {
        return NextResponse.json({ ok: false, message: "Could not resolve MAL anime ID" });
      }

      const params = new URLSearchParams();
      params.append("status", "plan_to_watch");

      const res = await fetch(`${MAL_CONFIG.API_URL}/anime/${targetId}/my_list_status`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const data = await res.json();
      return NextResponse.json({ ok: res.ok, data });
    }

    // -------------------------------------------------------------
    // 3. REMOVE FROM WATCHLIST (delete or dropped)
    // -------------------------------------------------------------
    if (action === "remove_watchlist") {
      let targetId = anime_id;
      if (!targetId && title) {
        targetId = await resolveMalId(title);
      }
      if (!targetId) {
        return NextResponse.json({ ok: false, message: "Could not resolve MAL anime ID" });
      }

      const res = await fetch(`${MAL_CONFIG.API_URL}/anime/${targetId}/my_list_status`, {
        method: "DELETE",
        headers,
      });
      return NextResponse.json({ ok: res.ok });
    }

    // -------------------------------------------------------------
    // 4. ADD / UPDATE PLAYBACK HISTORY (Continue Watching)
    // -------------------------------------------------------------
    if (action === "add_history") {
      let targetId = anime_id;
      if (!targetId && title) {
        targetId = await resolveMalId(title);
      }
      if (!targetId) {
        return NextResponse.json({ ok: false, message: "Could not resolve MAL anime ID" });
      }

      const targetEp = episode !== undefined ? episode : num_watched_episodes !== undefined ? num_watched_episodes : 1;
      const params = new URLSearchParams();
      params.append("status", status || "watching");
      params.append("num_watched_episodes", String(targetEp));
      if (score !== undefined) params.append("score", String(score));

      const res = await fetch(`${MAL_CONFIG.API_URL}/anime/${targetId}/my_list_status`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const data = await res.json();
      return NextResponse.json({ ok: res.ok, data });
    }

    // -------------------------------------------------------------
    // 5. BULK PUSH LOCAL ITEMS TO MAL
    // -------------------------------------------------------------
    if (action === "push_bulk" && Array.isArray(items)) {
      let updatedCount = 0;
      for (const it of items) {
        if (!it.title) continue;
        const targetId = it.anime_id || (await resolveMalId(it.title));
        if (!targetId) continue;

        const params = new URLSearchParams();
        params.append("status", it.status || (it.episode ? "watching" : "plan_to_watch"));
        if (it.episode) params.append("num_watched_episodes", String(it.episode));

        try {
          await fetch(`${MAL_CONFIG.API_URL}/anime/${targetId}/my_list_status`, {
            method: "PATCH",
            headers: {
              ...headers,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });
          updatedCount++;
        } catch {
          // Continue bulk loop
        }
      }
      return NextResponse.json({ ok: true, updatedCount });
    }

    // -------------------------------------------------------------
    // 6. DEFAULT PING / VERIFICATION
    // -------------------------------------------------------------
    const checkRes = await fetch(`${MAL_CONFIG.API_URL}/users/@me`, { headers });
    if (!checkRes.ok) {
      return NextResponse.json({ error: "Invalid session" }, { status: checkRes.status });
    }
    return NextResponse.json({ ok: true, message: "MyAnimeList sync checked" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error syncing to MAL", details: String(error) },
      { status: 500 },
    );
  }
}
