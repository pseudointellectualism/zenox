"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MediaType } from "../types";

export interface PlaybackMark {
  positionSeconds: number;
  durationSeconds: number;
  season?: number;
  episode?: number;
  updatedAt: number;
}

interface PlayerState {
  /** Last server the viewer chose, reused across titles. */
  preferredProviderId: string | null;
  /** Resume marks keyed by `${type}:${id}`. */
  marks: Record<string, PlaybackMark>;
  /** Keys of titles watched past the completion threshold. */
  completed: string[];

  setPreferredProvider: (providerId: string) => void;
  saveMark: (type: MediaType, id: string | number, mark: Omit<PlaybackMark, "updatedAt">) => void;
  getMark: (type: MediaType, id: string | number) => PlaybackMark | undefined;
  markCompleted: (type: MediaType, id: string | number) => void;
  clearMarks: () => void;
}

export const playbackKey = (type: MediaType, id: string | number) => `${type}:${id}`;

const COMPLETION_THRESHOLD = 0.92;

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      preferredProviderId: null,
      marks: {},
      completed: [],

      setPreferredProvider: (providerId) => set({ preferredProviderId: providerId }),

      saveMark: (type, id, mark) =>
        set((state) => {
          const key = playbackKey(type, id);
          const finished =
            mark.durationSeconds > 0 &&
            mark.positionSeconds / mark.durationSeconds >= COMPLETION_THRESHOLD;
          return {
            marks: { ...state.marks, [key]: { ...mark, updatedAt: Date.now() } },
            completed:
              finished && !state.completed.includes(key)
                ? [...state.completed, key]
                : state.completed,
          };
        }),

      getMark: (type, id) => get().marks[playbackKey(type, id)],

      markCompleted: (type, id) =>
        set((state) => {
          const key = playbackKey(type, id);
          return state.completed.includes(key)
            ? state
            : { completed: [...state.completed, key] };
        }),

      clearMarks: () => set({ marks: {}, completed: [] }),
    }),
    { name: "zenox.player.v1" },
  ),
);

/**
 * Persisted stores rehydrate after the first paint. Gate any store-derived UI
 * on this so server and client markup agree on the initial render.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
