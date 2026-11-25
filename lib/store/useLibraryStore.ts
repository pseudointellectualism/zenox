"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MediaSummary, MediaType } from "../types";

export interface LibraryEntry {
  id: number;
  mediaType: MediaType;
  title: string;
  /** Retained so recommendations can derive genre affinity from history. */
  genreIds: number[];
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
  addedAt: number;
}

export interface HistoryEntry extends LibraryEntry {
  /** 0–1. Anything at or above 0.92 counts as finished. */
  progress: number;
  positionSeconds: number;
  durationSeconds: number;
  season?: number;
  episode?: number;
  watchedAt: number;
}

interface LibraryState {
  watchlist: LibraryEntry[];
  history: HistoryEntry[];
  toggleWatchlist: (media: MediaSummary) => void;
  removeFromWatchlist: (id: number, mediaType: MediaType) => void;
  clearWatchlist: () => void;
  recordProgress: (
    media: MediaSummary,
    data: { positionSeconds: number; durationSeconds: number; season?: number; episode?: number },
  ) => void;
  removeFromHistory: (id: number, mediaType: MediaType) => void;
  clearHistory: () => void;
  importSyncedItems: (watchlistItems?: LibraryEntry[], historyItems?: HistoryEntry[]) => {
    importedWatchlistCount: number;
    importedHistoryCount: number;
  };
}

const keyOf = (id: number, mediaType: MediaType) => `${mediaType}:${id}`;

function toEntry(media: MediaSummary): LibraryEntry {
  return {
    id: media.id,
    mediaType: media.mediaType,
    title: media.title,
    genreIds: media.genreIds ?? [],
    posterPath: media.posterPath,
    backdropPath: media.backdropPath,
    releaseDate: media.releaseDate,
    voteAverage: media.voteAverage,
    addedAt: Date.now(),
  };
}

import { syncWatchlistChange, syncPlaybackProgress } from "@/lib/sync/syncEngine";

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      watchlist: [],
      history: [],

      toggleWatchlist: (media) =>
        set((state) => {
          const key = keyOf(media.id, media.mediaType);
          const exists = state.watchlist.some((e) => keyOf(e.id, e.mediaType) === key);
          // Sync to connected services in background
          syncWatchlistChange(media, exists ? "remove" : "add").catch(() => {});
          return {
            watchlist: exists
              ? state.watchlist.filter((e) => keyOf(e.id, e.mediaType) !== key)
              : [toEntry(media), ...state.watchlist],
          };
        }),

      removeFromWatchlist: (id, mediaType) =>
        set((state) => {
          syncWatchlistChange({ id, mediaType }, "remove").catch(() => {});
          return {
            watchlist: state.watchlist.filter((e) => keyOf(e.id, e.mediaType) !== keyOf(id, mediaType)),
          };
        }),

      clearWatchlist: () => set({ watchlist: [] }),

      recordProgress: (media, data) =>
        set((state) => {
          const key = keyOf(media.id, media.mediaType);
          const progress =
            data.durationSeconds > 0
              ? Math.min(1, data.positionSeconds / data.durationSeconds)
              : 0;
          const entry: HistoryEntry = {
            ...toEntry(media),
            progress,
            positionSeconds: data.positionSeconds,
            durationSeconds: data.durationSeconds,
            season: data.season,
            episode: data.episode,
            watchedAt: Date.now(),
          };

          // Sync playback progress / scrobble to connected services
          syncPlaybackProgress(media, { ...data, progress }).catch(() => {});

          return {
            history: [entry, ...state.history.filter((e) => keyOf(e.id, e.mediaType) !== key)].slice(
              0,
              60,
            ),
          };
        }),

      removeFromHistory: (id, mediaType) =>
        set((state) => ({
          history: state.history.filter((e) => keyOf(e.id, e.mediaType) !== keyOf(id, mediaType)),
        })),

      clearHistory: () => set({ history: [] }),

      importSyncedItems: (watchlistItems = [], historyItems = []) => {
        let addedW = 0;
        let addedH = 0;
        set((state) => {
          // Merge Watchlist
          const existingWatchlistKeys = new Set(state.watchlist.map((e) => keyOf(e.id, e.mediaType)));
          const newWatchlist = [...state.watchlist];
          for (const item of watchlistItems) {
            const key = keyOf(item.id, item.mediaType);
            if (!existingWatchlistKeys.has(key)) {
              existingWatchlistKeys.add(key);
              newWatchlist.unshift(item);
              addedW++;
            }
          }

          // Merge History (Continue Watching)
          const historyMap = new Map(state.history.map((e) => [keyOf(e.id, e.mediaType), e]));
          for (const item of historyItems) {
            const key = keyOf(item.id, item.mediaType);
            const existing = historyMap.get(key);
            const durationSeconds = item.durationSeconds > 0 ? item.durationSeconds : 1440;
            const progress = item.progress !== undefined ? item.progress : 0.5;
            const positionSeconds =
              item.positionSeconds > 0 ? item.positionSeconds : Math.floor(progress * durationSeconds);

            const prepared: HistoryEntry = {
              ...item,
              durationSeconds,
              positionSeconds,
              progress,
            };

            if (!existing) {
              historyMap.set(key, prepared);
              addedH++;
            } else {
              const shouldUpdate =
                (item.episode && (!existing.episode || item.episode > existing.episode)) ||
                (item.watchedAt && (!existing.watchedAt || item.watchedAt > existing.watchedAt));
              if (shouldUpdate) {
                historyMap.set(key, { ...existing, ...prepared });
                addedH++;
              }
            }
          }

          const newHistory = Array.from(historyMap.values())
            .sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))
            .slice(0, 60);

          return {
            watchlist: newWatchlist,
            history: newHistory,
          };
        });
        return { importedWatchlistCount: addedW, importedHistoryCount: addedH };
      },
    }),
    { name: "zenox.library.v1" },
  ),
);

/** Selector helper — avoids re-rendering every card when the list changes. */
export function useIsInWatchlist(id: number, mediaType: MediaType): boolean {
  return useLibraryStore((s) =>
    s.watchlist.some((e) => e.id === id && e.mediaType === mediaType),
  );
}
