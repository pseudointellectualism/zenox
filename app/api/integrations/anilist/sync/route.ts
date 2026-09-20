import { NextResponse } from "next/server";
import { ANILIST_CONFIG } from "@/lib/server/integrationsConfig";
import { matchAnimeToTMDB, resolveAniListId } from "@/lib/server/animeMatcher";
import type { LibraryEntry, HistoryEntry } from "@/lib/store/useLibraryStore";

export const dynamic = "force-dynamic";

const GET_VIEWER_AND_FAVS = `
  query {
    Viewer {
      id
      name
      favourites {
        anime {
          nodes {
            id
            idMal
            title {
              english
              romaji
              userPreferred
            }
            episodes
            coverImage {
              large
              extraLarge
            }
            bannerImage
            genres
            averageScore
            startDate {
              year
            }
          }
        }
      }
    }
  }
`;

const GET_USER_MEDIA_LISTS = `
  query ($userId: Int) {
    MediaListCollection (userId: $userId, type: ANIME) {
      lists {
        name
        status
        isCustomList
        entries {
          id
          status
          progress
          score
          updatedAt
          media {
            id
            idMal
            title {
              english
              romaji
              userPreferred
            }
            episodes
            coverImage {
              large
              extraLarge
            }
            bannerImage
            genres
            averageScore
            startDate {
              year
            }
          }
        }
      }
    }
  }
`;

const SAVE_MEDIA_LIST_ENTRY = `
  mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
    SaveMediaListEntry (mediaId: $mediaId, status: $status, progress: $progress, score: $score) {
      id
      status
      progress
    }
  }
`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      access_token,
      action,
      media_id,
      title,
      status,
      progress,
      episode,
      score,
      items,
    } = body;

    if (!access_token) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 });
    }

    const headers = {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Zenox/1.0",
    };

    // -------------------------------------------------------------
    // 1. PULL USER'S ANILIST LIBRARY (Favourites, Watchlist, Continue Watching)
    // -------------------------------------------------------------
    if (action === "get_library") {
      // 1. Fetch Viewer and Favourites
      const viewerRes = await fetch(ANILIST_CONFIG.API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: GET_VIEWER_AND_FAVS }),
        cache: "no-store",
      });

      if (!viewerRes.ok) {
        return NextResponse.json(
          { error: "Failed to fetch AniList viewer profile" },
          { status: viewerRes.status },
        );
      }

      const viewerJson = await viewerRes.json();
      const viewer = viewerJson?.data?.Viewer;
      const userId = viewer?.id;
      const favNodes = viewer?.favourites?.anime?.nodes || [];

      // 2. Fetch User Media Lists
      let listEntries: any[] = [];
      if (userId) {
        const listsRes = await fetch(ANILIST_CONFIG.API_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: GET_USER_MEDIA_LISTS,
            variables: { userId },
          }),
          cache: "no-store",
        });
        if (listsRes.ok) {
          const listsJson = await listsRes.json();
          const lists = listsJson?.data?.MediaListCollection?.lists || [];
          for (const l of lists) {
            if (Array.isArray(l.entries)) {
              listEntries.push(...l.entries);
            }
          }
        }
      }

      const watchlist: LibraryEntry[] = [];
      const history: HistoryEntry[] = [];
      const seenMediaKeys = new Set<string>();

      // A. Process AniList Favourites -> Zenox Watchlist / Favorites
      for (const media of favNodes) {
        if (!media) continue;
        const rawTitle = media.title?.userPreferred || media.title?.romaji || "";
        const englishTitle = media.title?.english || undefined;

        const tmdb = await matchAnimeToTMDB(rawTitle, {
          englishTitle,
          romajiTitle: media.title?.romaji,
          year: media.startDate?.year,
          fallbackImage: media.coverImage?.extraLarge || media.coverImage?.large,
        });

        const entry: LibraryEntry = tmdb
          ? {
              id: tmdb.id,
              mediaType: tmdb.mediaType,
              title: tmdb.title,
              genreIds: tmdb.genreIds ?? [16],
              posterPath:
                tmdb.posterPath || media.coverImage?.extraLarge || media.coverImage?.large,
              backdropPath: tmdb.backdropPath || media.bannerImage || null,
              releaseDate: tmdb.releaseDate || null,
              voteAverage: tmdb.voteAverage || (media.averageScore ? media.averageScore / 10 : 8.0),
              addedAt: Date.now(),
            }
          : {
              id: 9000000 + Number(media.id),
              mediaType: "tv",
              title: englishTitle || rawTitle,
              genreIds: [16],
              posterPath: media.coverImage?.extraLarge || media.coverImage?.large || null,
              backdropPath: media.bannerImage || null,
              releaseDate: media.startDate?.year ? `${media.startDate.year}-01-01` : null,
              voteAverage: media.averageScore ? media.averageScore / 10 : 8.0,
              addedAt: Date.now(),
            };

        const key = `${entry.mediaType}:${entry.id}`;
        if (!seenMediaKeys.has(key)) {
          seenMediaKeys.add(key);
          watchlist.push(entry);
        }
      }

      // B. Process AniList Collection (CURRENT -> History, PLANNING -> Watchlist)
      for (const entry of listEntries) {
        const media = entry.media;
        if (!media) continue;

        const rawTitle = media.title?.userPreferred || media.title?.romaji || "";
        const englishTitle = media.title?.english || undefined;
        const entryStatus = entry.status; // CURRENT, PLANNING, COMPLETED, DROPPED, PAUSED
        const progressCount = entry.progress || 0;
        const updatedAt = entry.updatedAt ? entry.updatedAt * 1000 : Date.now();

        const tmdb = await matchAnimeToTMDB(rawTitle, {
          englishTitle,
          romajiTitle: media.title?.romaji,
          year: media.startDate?.year,
          fallbackImage: media.coverImage?.extraLarge || media.coverImage?.large,
        });

        const baseEntry: LibraryEntry = tmdb
          ? {
              id: tmdb.id,
              mediaType: tmdb.mediaType,
              title: tmdb.title,
              genreIds: tmdb.genreIds ?? [16],
              posterPath:
                tmdb.posterPath || media.coverImage?.extraLarge || media.coverImage?.large,
              backdropPath: tmdb.backdropPath || media.bannerImage || null,
              releaseDate: tmdb.releaseDate || null,
              voteAverage: tmdb.voteAverage || (media.averageScore ? media.averageScore / 10 : 8.0),
              addedAt: updatedAt,
            }
          : {
              id: 9000000 + Number(media.id),
              mediaType: "tv",
              title: englishTitle || rawTitle,
              genreIds: [16],
              posterPath: media.coverImage?.extraLarge || media.coverImage?.large || null,
              backdropPath: media.bannerImage || null,
              releaseDate: media.startDate?.year ? `${media.startDate.year}-01-01` : null,
              voteAverage: media.averageScore ? media.averageScore / 10 : 8.0,
              addedAt: updatedAt,
            };

        const key = `${baseEntry.mediaType}:${baseEntry.id}`;

        if (entryStatus === "CURRENT") {
          // Add to Continue Watching (history)
          history.push({
            ...baseEntry,
            progress: 0.5,
            positionSeconds: 720,
            durationSeconds: 1440,
            season: 1,
            episode: Math.max(1, progressCount),
            watchedAt: updatedAt,
          });
        } else if (entryStatus === "PLANNING" && !seenMediaKeys.has(key)) {
          seenMediaKeys.add(key);
          watchlist.push(baseEntry);
        } else if (entryStatus === "COMPLETED") {
          history.push({
            ...baseEntry,
            progress: 1.0,
            positionSeconds: 1440,
            durationSeconds: 1440,
            season: 1,
            episode: Math.max(1, media.episodes || progressCount),
            watchedAt: updatedAt,
          });
        }
      }

      return NextResponse.json({
        ok: true,
        watchlist,
        history,
        totalFavourites: favNodes.length,
        totalEntries: listEntries.length,
      });
    }

    // -------------------------------------------------------------
    // 2. ADD TO WATCHLIST (PLANNING)
    // -------------------------------------------------------------
    if (action === "add_watchlist") {
      let targetId = media_id;
      if (!targetId && title) {
        targetId = await resolveAniListId(title, access_token);
      }
      if (!targetId) {
        return NextResponse.json({ ok: false, message: "Could not resolve AniList media ID" });
      }

      const res = await fetch(ANILIST_CONFIG.API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: SAVE_MEDIA_LIST_ENTRY,
          variables: {
            mediaId: Number(targetId),
            status: "PLANNING",
          },
        }),
      });
      const data = await res.json();
      return NextResponse.json({ ok: res.ok, data });
    }

    // -------------------------------------------------------------
    // 3. REMOVE FROM WATCHLIST (DROPPED)
    // -------------------------------------------------------------
    if (action === "remove_watchlist") {
      let targetId = media_id;
      if (!targetId && title) {
        targetId = await resolveAniListId(title, access_token);
      }
      if (!targetId) {
        return NextResponse.json({ ok: false, message: "Could not resolve AniList media ID" });
      }

      const res = await fetch(ANILIST_CONFIG.API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: SAVE_MEDIA_LIST_ENTRY,
          variables: {
            mediaId: Number(targetId),
            status: "DROPPED",
          },
        }),
      });
      const data = await res.json();
      return NextResponse.json({ ok: res.ok, data });
    }

    // -------------------------------------------------------------
    // 4. ADD / UPDATE PLAYBACK HISTORY (Continue Watching)
    // -------------------------------------------------------------
    if (action === "add_history") {
      let targetId = media_id;
      if (!targetId && title) {
        targetId = await resolveAniListId(title, access_token);
      }
      if (!targetId) {
        return NextResponse.json({ ok: false, message: "Could not resolve AniList media ID" });
      }

      const targetEp =
        progress !== undefined ? progress : episode !== undefined ? episode : 1;

      const res = await fetch(ANILIST_CONFIG.API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: SAVE_MEDIA_LIST_ENTRY,
          variables: {
            mediaId: Number(targetId),
            status: status || "CURRENT",
            progress: Number(targetEp),
            score: score !== undefined ? Number(score) : undefined,
          },
        }),
      });
      const data = await res.json();
      return NextResponse.json({ ok: res.ok, data });
    }

    // -------------------------------------------------------------
    // 5. BULK PUSH LOCAL ITEMS TO ANILIST
    // -------------------------------------------------------------
    if (action === "push_bulk" && Array.isArray(items)) {
      let updatedCount = 0;
      for (const it of items) {
        if (!it.title) continue;
        const targetId = it.media_id || (await resolveAniListId(it.title, access_token));
        if (!targetId) continue;

        try {
          await fetch(ANILIST_CONFIG.API_URL, {
            method: "POST",
            headers,
            body: JSON.stringify({
              query: SAVE_MEDIA_LIST_ENTRY,
              variables: {
                mediaId: Number(targetId),
                status: it.status || (it.episode ? "CURRENT" : "PLANNING"),
                progress: it.episode ? Number(it.episode) : undefined,
              },
            }),
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
    const checkRes = await fetch(ANILIST_CONFIG.API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: `query { Viewer { id name } }` }),
    });
    if (!checkRes.ok) {
      return NextResponse.json({ error: "Invalid session" }, { status: checkRes.status });
    }
    return NextResponse.json({ ok: true, message: "AniList sync checked" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error syncing to AniList", details: String(error) },
      { status: 500 },
    );
  }
}
