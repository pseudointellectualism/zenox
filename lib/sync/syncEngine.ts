import { useConnectionsStore } from "@/lib/store/useConnectionsStore";
import { useLibraryStore, type LibraryEntry, type HistoryEntry } from "@/lib/store/useLibraryStore";
import type { MediaType } from "@/lib/types";

// Throttle history sync per media key to avoid API spamming
const lastHistorySyncMap = new Map<string, number>();

/**
 * Syncs a watchlist change (add or remove) to connected third-party services (Trakt, Simkl, MAL, AniList).
 */
export async function syncWatchlistChange(
  media: { id: number; mediaType: MediaType; title?: string },
  action: "add" | "remove",
) {
  const {
    trakt,
    simkl,
    mal,
    anilist,
    setTraktLastSync,
    setSimklLastSync,
    setMalLastSync,
    setAniListLastSync,
  } = useConnectionsStore.getState();

  // 1. Trakt Watchlist Sync
  if (trakt.connected && trakt.accessToken) {
    try {
      const payload =
        media.mediaType === "movie"
          ? { movies: [{ ids: { tmdb: media.id } }] }
          : { shows: [{ ids: { tmdb: media.id } }] };

      fetch("/api/integrations/trakt/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: trakt.accessToken,
          action: action === "add" ? "add_watchlist" : "remove_watchlist",
          payload,
        }),
      })
        .then((res) => {
          if (res.ok) setTraktLastSync();
        })
        .catch(() => {});
    } catch {
      // Non-blocking
    }
  }

  // 2. Simkl Watchlist Sync
  if (simkl.connected && simkl.accessToken) {
    try {
      const to = action === "add" ? "plantowatch" : "dropped";
      const payload =
        media.mediaType === "movie"
          ? { movies: [{ to, ids: { tmdb: media.id } }] }
          : { shows: [{ to, ids: { tmdb: media.id } }] };

      fetch("/api/integrations/simkl/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: simkl.accessToken,
          action: "add_watchlist",
          payload,
        }),
      })
        .then((res) => {
          if (res.ok) setSimklLastSync();
        })
        .catch(() => {});
    } catch {
      // Non-blocking
    }
  }

  // 3. MAL Watchlist Sync
  if (mal?.connected && mal.accessToken && media.title) {
    try {
      fetch("/api/integrations/mal/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: mal.accessToken,
          action: action === "add" ? "add_watchlist" : "remove_watchlist",
          title: media.title,
        }),
      })
        .then((res) => {
          if (res.ok) setMalLastSync();
        })
        .catch(() => {});
    } catch {
      // Non-blocking
    }
  }

  // 4. AniList Watchlist Sync
  if (anilist?.connected && anilist.accessToken && media.title) {
    try {
      fetch("/api/integrations/anilist/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: anilist.accessToken,
          action: action === "add" ? "add_watchlist" : "remove_watchlist",
          title: media.title,
        }),
      })
        .then((res) => {
          if (res.ok) setAniListLastSync();
        })
        .catch(() => {});
    } catch {
      // Non-blocking
    }
  }
}

/**
 * Syncs watch progress / history to Trakt, Simkl, MAL, and AniList.
 * Throttled to max once every 45 seconds per media item or when finished (> 85%).
 */
export async function syncPlaybackProgress(
  media: { id: number; mediaType: MediaType; title?: string },
  data: {
    positionSeconds: number;
    durationSeconds: number;
    season?: number;
    episode?: number;
    progress?: number;
  },
) {
  const {
    trakt,
    simkl,
    mal,
    anilist,
    setTraktLastSync,
    setSimklLastSync,
    setMalLastSync,
    setAniListLastSync,
  } = useConnectionsStore.getState();

  const anyConnected =
    (trakt.connected && trakt.accessToken) ||
    (simkl.connected && simkl.accessToken) ||
    (mal?.connected && mal.accessToken) ||
    (anilist?.connected && anilist.accessToken);

  if (!anyConnected) return;

  const key = `${media.mediaType}:${media.id}:${data.season || 0}:${data.episode || 0}`;
  const now = Date.now();
  const lastSync = lastHistorySyncMap.get(key) || 0;

  const isFinished = data.progress !== undefined && data.progress >= 0.85;
  // If not finished and less than 45 seconds since last sync, throttle
  if (!isFinished && now - lastSync < 45000) {
    return;
  }

  lastHistorySyncMap.set(key, now);

  // 1. Trakt History Scrobble
  if (trakt.connected && trakt.accessToken) {
    try {
      let payload: Record<string, any>;
      if (media.mediaType === "movie") {
        payload = {
          movies: [
            {
              ids: { tmdb: media.id },
              watched_at: new Date().toISOString(),
            },
          ],
        };
      } else {
        payload = {
          shows: [
            {
              ids: { tmdb: media.id },
              seasons: [
                {
                  number: data.season || 1,
                  episodes: [
                    {
                      number: data.episode || 1,
                      watched_at: new Date().toISOString(),
                    },
                  ],
                },
              ],
            },
          ],
        };
      }

      fetch("/api/integrations/trakt/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: trakt.accessToken,
          action: "add_history",
          payload,
        }),
      })
        .then((res) => {
          if (res.ok) setTraktLastSync();
        })
        .catch(() => {});
    } catch {
      // Non-blocking
    }
  }

  // 2. Simkl History Sync
  if (simkl.connected && simkl.accessToken) {
    try {
      let payload: Record<string, any>;
      if (media.mediaType === "movie") {
        payload = {
          movies: [{ ids: { tmdb: media.id } }],
        };
      } else {
        payload = {
          shows: [
            {
              ids: { tmdb: media.id },
              seasons: [
                {
                  number: data.season || 1,
                  episodes: [{ number: data.episode || 1 }],
                },
              ],
            },
          ],
        };
      }

      fetch("/api/integrations/simkl/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: simkl.accessToken,
          action: "add_history",
          payload,
        }),
      })
        .then((res) => {
          if (res.ok) setSimklLastSync();
        })
        .catch(() => {});
    } catch {
      // Non-blocking
    }
  }

  // 3. MAL History Sync
  if (mal?.connected && mal.accessToken && media.title) {
    try {
      fetch("/api/integrations/mal/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: mal.accessToken,
          action: "add_history",
          title: media.title,
          episode: data.episode || 1,
          status: isFinished ? "completed" : "watching",
        }),
      })
        .then((res) => {
          if (res.ok) setMalLastSync();
        })
        .catch(() => {});
    } catch {
      // Non-blocking
    }
  }

  // 4. AniList History Sync
  if (anilist?.connected && anilist.accessToken && media.title) {
    try {
      fetch("/api/integrations/anilist/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: anilist.accessToken,
          action: "add_history",
          title: media.title,
          progress: data.episode || 1,
          status: isFinished ? "COMPLETED" : "CURRENT",
        }),
      })
        .then((res) => {
          if (res.ok) setAniListLastSync();
        })
        .catch(() => {});
    } catch {
      // Non-blocking
    }
  }
}

/**
 * Bulk two-way sync: imports remote library/continue watching to Zenox,
 * and pushes local changes to third-party services.
 */
export async function syncBulkToIntegrations(
  watchlist: LibraryEntry[],
  history: HistoryEntry[],
  target?: "trakt" | "simkl" | "mal" | "anilist" | "all",
): Promise<{
  importedWatchlist: number;
  importedHistory: number;
}> {
  const {
    trakt,
    simkl,
    mal,
    anilist,
    setTraktLastSync,
    setSimklLastSync,
    setMalLastSync,
    setAniListLastSync,
  } = useConnectionsStore.getState();

  let totalImportedWatchlist = 0;
  let totalImportedHistory = 0;

  // Bulk Trakt
  if ((target === "all" || target === "trakt") && trakt?.connected && trakt.accessToken) {
    try {
      const movies = watchlist
        .filter((w) => w.mediaType === "movie")
        .map((m) => ({ ids: { tmdb: m.id } }));
      const shows = watchlist
        .filter((w) => w.mediaType === "tv")
        .map((s) => ({ ids: { tmdb: s.id } }));

      if (movies.length || shows.length) {
        await fetch("/api/integrations/trakt/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: trakt.accessToken,
            action: "add_watchlist",
            payload: { movies, shows },
          }),
        });
      }

      // History
      const histMovies = history
        .filter((h) => h.mediaType === "movie")
        .map((m) => ({ ids: { tmdb: m.id }, watched_at: new Date(m.watchedAt).toISOString() }));

      if (histMovies.length) {
        await fetch("/api/integrations/trakt/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: trakt.accessToken,
            action: "add_history",
            payload: { movies: histMovies },
          }),
        });
      }

      setTraktLastSync();
    } catch {
      // Non-blocking
    }
  }

  // Bulk Simkl (sequential batches to obey rate limits)
  if ((target === "all" || target === "simkl") && simkl?.connected && simkl.accessToken) {
    try {
      const movies = watchlist
        .filter((w) => w.mediaType === "movie")
        .map((m) => ({ to: "plantowatch", ids: { tmdb: m.id } }));
      const shows = watchlist
        .filter((w) => w.mediaType === "tv")
        .map((s) => ({ to: "plantowatch", ids: { tmdb: s.id } }));

      if (movies.length || shows.length) {
        await fetch("/api/integrations/simkl/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: simkl.accessToken,
            action: "add_watchlist",
            payload: { movies, shows },
          }),
        });
      }

      setSimklLastSync();
    } catch {
      // Non-blocking
    }
  }

  // MAL Two-Way Sync (Pull from MAL into Zenox & Push local anime to MAL)
  if ((target === "all" || target === "mal") && mal?.connected && mal.accessToken) {
    try {
      // 1. PULL from MAL into Zenox Library & Continue Watching
      const pullRes = await fetch("/api/integrations/mal/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: mal.accessToken,
          action: "get_library",
        }),
      });

      if (pullRes.ok) {
        const pullData = await pullRes.json();
        if (pullData.ok && (pullData.watchlist?.length || pullData.history?.length)) {
          const stats = useLibraryStore
            .getState()
            .importSyncedItems(pullData.watchlist, pullData.history);
          totalImportedWatchlist += stats.importedWatchlistCount;
          totalImportedHistory += stats.importedHistoryCount;
        }
      }

      // 2. PUSH local anime items to MAL
      const itemsToPush = [
        ...watchlist.filter((w) => w.title).map((w) => ({ title: w.title, status: "plan_to_watch" })),
        ...history
          .filter((h) => h.title)
          .map((h) => ({
            title: h.title,
            episode: h.episode || 1,
            status: h.progress >= 0.95 ? "completed" : "watching",
          })),
      ];

      if (itemsToPush.length > 0) {
        await fetch("/api/integrations/mal/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: mal.accessToken,
            action: "push_bulk",
            items: itemsToPush.slice(0, 50),
          }),
        });
      }

      setMalLastSync();
    } catch {
      // Non-blocking
    }
  }

  // AniList Two-Way Sync (Pull favourites & lists from AniList, and push local anime)
  if ((target === "all" || target === "anilist") && anilist?.connected && anilist.accessToken) {
    try {
      // 1. PULL from AniList into Zenox Library & Continue Watching
      const pullRes = await fetch("/api/integrations/anilist/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: anilist.accessToken,
          action: "get_library",
        }),
      });

      if (pullRes.ok) {
        const pullData = await pullRes.json();
        if (pullData.ok && (pullData.watchlist?.length || pullData.history?.length)) {
          const stats = useLibraryStore
            .getState()
            .importSyncedItems(pullData.watchlist, pullData.history);
          totalImportedWatchlist += stats.importedWatchlistCount;
          totalImportedHistory += stats.importedHistoryCount;
        }
      }

      // 2. PUSH local anime items to AniList
      const itemsToPush = [
        ...watchlist.filter((w) => w.title).map((w) => ({ title: w.title, status: "PLANNING" })),
        ...history
          .filter((h) => h.title)
          .map((h) => ({
            title: h.title,
            episode: h.episode || 1,
            status: h.progress >= 0.95 ? "COMPLETED" : "CURRENT",
          })),
      ];

      if (itemsToPush.length > 0) {
        await fetch("/api/integrations/anilist/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: anilist.accessToken,
            action: "push_bulk",
            items: itemsToPush.slice(0, 50),
          }),
        });
      }

      setAniListLastSync();
    } catch {
      // Non-blocking
    }
  }

  return {
    importedWatchlist: totalImportedWatchlist,
    importedHistory: totalImportedHistory,
  };
}
