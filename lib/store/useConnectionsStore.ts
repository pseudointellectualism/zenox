"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ConnectedUser {
  username: string;
  name?: string;
  avatarUrl: string | null;
}

export interface TraktConnection {
  connected: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: ConnectedUser | null;
  lastSyncAt: number | null;
}

export interface SimklConnection {
  connected: boolean;
  accessToken: string | null;
  user: ConnectedUser | null;
  lastSyncAt: number | null;
  lastActivityDate: string | null;
}

export interface MalConnection {
  connected: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  user: ConnectedUser | null;
  lastSyncAt: number | null;
}

export interface AniListConnection {
  connected: boolean;
  accessToken: string | null;
  user: ConnectedUser | null;
  lastSyncAt: number | null;
}

export interface TheIntroDbColors {
  intro: string;
  recap: string;
  credits: string;
  preview: string;
}

export interface TheIntroDbSettings {
  enabled: boolean;
  colors: TheIntroDbColors;
}

export const DEFAULT_THEINTRODB_COLORS: TheIntroDbColors = {
  intro: "#f97316",
  recap: "#00d9ff",
  credits: "#27f718",
  preview: "#ec4899",
};

interface ConnectionsState {
  trakt: TraktConnection;
  simkl: SimklConnection;
  mal: MalConnection;
  anilist: AniListConnection;
  theintrodb: TheIntroDbSettings;

  // TheIntroDB actions
  setTheIntroDbEnabled: (enabled: boolean) => void;
  setTheIntroDbColor: (segment: keyof TheIntroDbColors, color: string) => void;
  resetTheIntroDbColors: () => void;

  // Trakt actions
  setTraktConnected: (params: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    user: ConnectedUser;
  }) => void;
  updateTraktUser: (user: ConnectedUser) => void;
  disconnectTrakt: () => void;
  setTraktLastSync: (time?: number) => void;

  // Simkl actions
  setSimklConnected: (params: {
    accessToken: string;
    user: ConnectedUser;
  }) => void;
  updateSimklUser: (user: ConnectedUser) => void;
  disconnectSimkl: () => void;
  setSimklLastSync: (time?: number, activityDate?: string) => void;

  // MAL actions
  setMalConnected: (params: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    user: ConnectedUser;
  }) => void;
  updateMalUser: (user: ConnectedUser) => void;
  disconnectMal: () => void;
  setMalLastSync: (time?: number) => void;

  // AniList actions
  setAniListConnected: (params: {
    accessToken: string;
    user: ConnectedUser;
  }) => void;
  updateAniListUser: (user: ConnectedUser) => void;
  disconnectAniList: () => void;
  setAniListLastSync: (time?: number) => void;
}

const initialTrakt: TraktConnection = {
  connected: false,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  user: null,
  lastSyncAt: null,
};

const initialSimkl: SimklConnection = {
  connected: false,
  accessToken: null,
  user: null,
  lastSyncAt: null,
  lastActivityDate: null,
};

const initialMal: MalConnection = {
  connected: false,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  user: null,
  lastSyncAt: null,
};

const initialAniList: AniListConnection = {
  connected: false,
  accessToken: null,
  user: null,
  lastSyncAt: null,
};

const initialTheIntroDb: TheIntroDbSettings = {
  enabled: true,
  colors: { ...DEFAULT_THEINTRODB_COLORS },
};


export const useConnectionsStore = create<ConnectionsState>()(
  persist(
    (set) => ({
      trakt: initialTrakt,
      simkl: initialSimkl,
      mal: initialMal,
      anilist: initialAniList,
      theintrodb: initialTheIntroDb,

      setTheIntroDbEnabled: (enabled) =>
        set((state) => ({
          theintrodb: { ...(state.theintrodb || initialTheIntroDb), enabled },
        })),

      setTheIntroDbColor: (segment, color) =>
        set((state) => ({
          theintrodb: {
            ...(state.theintrodb || initialTheIntroDb),
            colors: {
              ...(state.theintrodb?.colors || DEFAULT_THEINTRODB_COLORS),
              [segment]: color,
            },
          },
        })),

      resetTheIntroDbColors: () =>
        set((state) => ({
          theintrodb: {
            ...(state.theintrodb || initialTheIntroDb),
            colors: { ...DEFAULT_THEINTRODB_COLORS },
          },
        })),

      setTraktConnected: ({ accessToken, refreshToken, expiresAt, user }) =>
        set((state) => ({
          trakt: {
            connected: true,
            accessToken,
            refreshToken: refreshToken || null,
            expiresAt: expiresAt || null,
            user,
            lastSyncAt: Date.now(),
          },
        })),

      updateTraktUser: (user) =>
        set((state) => ({
          trakt: { ...state.trakt, user },
        })),

      disconnectTrakt: () =>
        set((state) => ({
          trakt: initialTrakt,
        })),

      setTraktLastSync: (time = Date.now()) =>
        set((state) => ({
          trakt: { ...state.trakt, lastSyncAt: time },
        })),

      setSimklConnected: ({ accessToken, user }) =>
        set((state) => ({
          simkl: {
            connected: true,
            accessToken,
            user,
            lastSyncAt: Date.now(),
            lastActivityDate: null,
          },
        })),

      updateSimklUser: (user) =>
        set((state) => ({
          simkl: { ...state.simkl, user },
        })),

      disconnectSimkl: () =>
        set((state) => ({
          simkl: initialSimkl,
        })),

      setSimklLastSync: (time = Date.now(), activityDate) =>
        set((state) => ({
          simkl: {
            ...state.simkl,
            lastSyncAt: time,
            lastActivityDate: activityDate || state.simkl.lastActivityDate,
          },
        })),

      // MAL actions
      setMalConnected: ({ accessToken, refreshToken, expiresAt, user }) =>
        set((state) => ({
          mal: {
            connected: true,
            accessToken,
            refreshToken: refreshToken || null,
            expiresAt: expiresAt || null,
            user,
            lastSyncAt: Date.now(),
          },
        })),

      updateMalUser: (user) =>
        set((state) => ({
          mal: { ...(state.mal || initialMal), user },
        })),

      disconnectMal: () =>
        set((state) => ({
          mal: initialMal,
        })),

      setMalLastSync: (time = Date.now()) =>
        set((state) => ({
          mal: { ...(state.mal || initialMal), lastSyncAt: time },
        })),

      // AniList actions
      setAniListConnected: ({ accessToken, user }) =>
        set((state) => ({
          anilist: {
            connected: true,
            accessToken,
            user,
            lastSyncAt: Date.now(),
          },
        })),

      updateAniListUser: (user) =>
        set((state) => ({
          anilist: { ...(state.anilist || initialAniList), user },
        })),

      disconnectAniList: () =>
        set((state) => ({
          anilist: initialAniList,
        })),

      setAniListLastSync: (time = Date.now()) =>
        set((state) => ({
          anilist: { ...(state.anilist || initialAniList), lastSyncAt: time },
        })),

    }),
    {
      name: "zenox-connections",
    },
  ),
);
