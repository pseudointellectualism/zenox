"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";

import MediaDrawer from "@/components/overlay/MediaDrawer";
import SearchModal from "@/components/overlay/SearchModal";
import SettingsModal from "@/components/overlay/SettingsModal";
import { buildMediaWatchUrl } from "@/lib/mediaRoute";
import { OAUTH_REDIRECT_URI } from "@/lib/siteConfig";
import { useConnectionsStore } from "@/lib/store/useConnectionsStore";
import { useLibraryStore } from "@/lib/store/useLibraryStore";
import { preloadConnections } from "@/lib/utils/connectionsPreload";
import { syncBulkToIntegrations } from "@/lib/sync/syncEngine";
import type { MediaType } from "@/lib/types";

export interface ActiveMedia {
  type: MediaType;
  id: number | string;
  season?: number;
  episode?: number;
}

export interface ActiveWatch {
  type: MediaType;
  id: number | string;
  season?: number;
  episode?: number;
}

interface OverlayApi {
  openSettings: () => void;
  openSearch: () => void;
  openMedia: (type: MediaType, id: number | string, season?: number, episode?: number) => void;
  openWatch: (type: MediaType, id: number | string, season?: number, episode?: number) => void;
  close: () => void;
}

const OverlayContext = createContext<OverlayApi | null>(null);

export function useOverlay(): OverlayApi {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay must be used inside <OverlayProvider>");
  return ctx;
}

const SETTINGS_PARAM = "settings";
const SEARCH_PARAM = "search";
const MEDIA_PARAM = "media";
const WATCH_PARAM = "watch";

function parseMediaParam(val: string | null): ActiveMedia | null {
  if (!val) return null;

  // Format: series-108978-5-1
  const seriesEpMatch = val.match(/^series-(\d+)-(\d+)-(\d+)$/);
  if (seriesEpMatch) {
    return {
      type: "tv",
      id: seriesEpMatch[1],
      season: parseInt(seriesEpMatch[2], 10),
      episode: parseInt(seriesEpMatch[3], 10),
    };
  }

  // Format: series-108978 or tv-108978
  if (val.startsWith("series-")) {
    return { type: "tv", id: val.replace("series-", "") };
  }
  if (val.startsWith("tv-")) {
    return { type: "tv", id: val.replace("tv-", "") };
  }

  // Format: movie-1386315
  if (val.startsWith("movie-")) {
    return { type: "movie", id: val.replace("movie-", "") };
  }

  const parts = val.split(/[:-]/);
  if (parts.length >= 2 && (parts[0] === "movie" || parts[0] === "tv")) {
    return { type: parts[0] as MediaType, id: parts.slice(1).join("-") };
  }
  return null;
}

function parseWatchParam(val: string | null): ActiveWatch | null {
  if (!val) return null;

  // Format: series-108978-5-1
  const seriesEpMatch = val.match(/^series-(\d+)-(\d+)-(\d+)$/);
  if (seriesEpMatch) {
    return {
      type: "tv",
      id: seriesEpMatch[1],
      season: parseInt(seriesEpMatch[2], 10),
      episode: parseInt(seriesEpMatch[3], 10),
    };
  }

  // Format: series-108978 or tv-108978
  if (val.startsWith("series-")) {
    return { type: "tv", id: val.replace("series-", ""), season: 1, episode: 1 };
  }
  if (val.startsWith("tv-")) {
    return { type: "tv", id: val.replace("tv-", ""), season: 1, episode: 1 };
  }

  // Format: movie-1386315
  if (val.startsWith("movie-")) {
    return { type: "movie", id: val.replace("movie-", "") };
  }

  const parts = val.split(/[:-]/);
  if (parts.length >= 2 && (parts[0] === "movie" || parts[0] === "tv")) {
    return { type: parts[0] as MediaType, id: parts.slice(1).join("-") };
  }
  return null;
}

function writeUrl(param: string, value: string | null, mode: "push" | "replace") {
  const params = new URLSearchParams(window.location.search);
  if (value !== null) {
    // Clear other overlay params when opening one
    params.delete(SETTINGS_PARAM);
    params.delete(SEARCH_PARAM);
    params.delete(MEDIA_PARAM);
    params.delete(WATCH_PARAM);
    params.set(param, value);
  } else {
    params.delete(param);
  }

  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history[mode === "push" ? "pushState" : "replaceState"](null, "", url);
}

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMedia, setActiveMedia] = useState<ActiveMedia | null>(null);
  const pushedRef = useRef(false);

  // Restore from the URL on first paint
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const watchSlug = params.get(WATCH_PARAM);
    if (watchSlug) {
      router.replace(`/media/${watchSlug}`);
      return;
    }

    // Capture OAuth2 redirect code (?code=...) from Trakt, Simkl, MAL, or AniList
    const code = params.get("code");
    const state =
      params.get("state") ||
      (typeof window !== "undefined" ? localStorage.getItem("zenox_oauth_pending") : null);

    // Handle AniList implicit token in URL hash if redirected with #access_token=...
    if (typeof window !== "undefined" && window.location.hash && window.location.hash.includes("access_token")) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashToken = hashParams.get("access_token");
      if (hashToken) {
        fetch("/api/integrations/anilist/oauth-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: hashToken }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "SUCCESS" && data.access_token) {
              useConnectionsStore.getState().setAniListConnected({
                accessToken: data.access_token,
                user: data.user,
              });
              const { watchlist, history } = useLibraryStore.getState();
              syncBulkToIntegrations(watchlist, history, "anilist").catch(() => {});
              setSettingsOpen(true);
            }
          })
          .catch(() => {});
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }

    if (code) {
      params.delete("code");
      params.delete("state");
      const query = params.toString();
      const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
      window.history.replaceState(null, "", url);
      if (typeof window !== "undefined") {
        localStorage.removeItem("zenox_oauth_pending");
      }

      if (state === "simkl") {
        fetch("/api/integrations/simkl/oauth-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirect_uri: OAUTH_REDIRECT_URI }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "SUCCESS" && data.access_token) {
              useConnectionsStore.getState().setSimklConnected({
                accessToken: data.access_token,
                user: data.user,
              });
              const { watchlist, history } = useLibraryStore.getState();
              syncBulkToIntegrations(watchlist, history, "simkl").catch(() => {});
              setSettingsOpen(true);
            }
          })
          .catch(() => {});
      } else if (state === "mal") {
        const codeVerifier =
          typeof window !== "undefined" ? localStorage.getItem("zenox_mal_code_verifier") : null;
        if (typeof window !== "undefined") {
          localStorage.removeItem("zenox_mal_code_verifier");
        }
        fetch("/api/integrations/mal/oauth-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, code_verifier: codeVerifier, redirect_uri: OAUTH_REDIRECT_URI }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "SUCCESS" && data.access_token) {
              useConnectionsStore.getState().setMalConnected({
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: Date.now() + (data.expires_in || 2678400) * 1000,
                user: data.user,
              });
              const { watchlist, history } = useLibraryStore.getState();
              syncBulkToIntegrations(watchlist, history, "mal").catch(() => {});
              setSettingsOpen(true);
            }
          })
          .catch(() => {});
      } else if (state === "anilist") {
        fetch("/api/integrations/anilist/oauth-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirect_uri: OAUTH_REDIRECT_URI }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "SUCCESS" && data.access_token) {
              useConnectionsStore.getState().setAniListConnected({
                accessToken: data.access_token,
                user: data.user,
              });
              const { watchlist, history } = useLibraryStore.getState();
              syncBulkToIntegrations(watchlist, history, "anilist").catch(() => {});
              setSettingsOpen(true);
            }
          })
          .catch(() => {});
      } else {
        fetch("/api/integrations/trakt/oauth-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirect_uri: OAUTH_REDIRECT_URI }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "SUCCESS" && data.access_token) {
              useConnectionsStore.getState().setTraktConnected({
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: Date.now() + (data.expires_in || 7776000) * 1000,
                user: data.user,
              });
              const { watchlist, history } = useLibraryStore.getState();
              syncBulkToIntegrations(watchlist, history, "trakt").catch(() => {});
              setSettingsOpen(true);
            }
          })
          .catch(() => {});
      }
    }


    setSettingsOpen(params.has(SETTINGS_PARAM) || Boolean(code));
    setSearchOpen(params.has(SEARCH_PARAM));
    setActiveMedia(parseMediaParam(params.get(MEDIA_PARAM)));
  }, [router]);

  // Back and Forward move through overlay state
  useEffect(() => {
    const onPopState = () => {
      pushedRef.current = false;
      const params = new URLSearchParams(window.location.search);
      const watchSlug = params.get(WATCH_PARAM);
      if (watchSlug) {
        router.replace(`/media/${watchSlug}`);
        return;
      }
      setSettingsOpen(params.has(SETTINGS_PARAM));
      setSearchOpen(params.has(SEARCH_PARAM));
      setActiveMedia(parseMediaParam(params.get(MEDIA_PARAM)));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [router]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    const params = new URLSearchParams(window.location.search);
    if (params.has(SEARCH_PARAM)) {
      params.delete(SEARCH_PARAM);
      const query = params.toString();
      const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
      window.history.replaceState(null, "", url);
    }
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    const params = new URLSearchParams(window.location.search);
    if (params.has(SETTINGS_PARAM)) {
      params.delete(SETTINGS_PARAM);
      const query = params.toString();
      const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
      window.history.replaceState(null, "", url);
    }
  }, []);

  const closeMedia = useCallback(() => {
    setActiveMedia(null);
    const params = new URLSearchParams(window.location.search);
    if (params.has(MEDIA_PARAM)) {
      params.delete(MEDIA_PARAM);
      const query = params.toString();
      const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
      window.history.replaceState(null, "", url);
    }
  }, []);

  const close = useCallback(() => {
    const wasOpen = settingsOpen || searchOpen || activeMedia !== null;
    setSettingsOpen(false);
    setSearchOpen(false);
    setActiveMedia(null);
    pushedRef.current = false;

    if (wasOpen) {
      const params = new URLSearchParams(window.location.search);
      params.delete(SETTINGS_PARAM);
      params.delete(SEARCH_PARAM);
      params.delete(MEDIA_PARAM);
      params.delete(WATCH_PARAM);
      const query = params.toString();
      const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
      window.history.replaceState(null, "", url);
    }
  }, [settingsOpen, searchOpen, activeMedia]);

  const api = useMemo<OverlayApi>(
    () => ({
      openSettings: () => {
        preloadConnections();
        setActiveMedia(null);
        setSearchOpen(false);
        setSettingsOpen(true);
        writeUrl(SETTINGS_PARAM, "1", "push");
        pushedRef.current = true;
      },
      openSearch: () => {
        setActiveMedia(null);
        setSettingsOpen(false);
        setSearchOpen(true);
        writeUrl(SEARCH_PARAM, "1", "push");
        pushedRef.current = true;
      },
      openMedia: (
        type: MediaType,
        id: number | string,
        season?: number,
        episode?: number,
      ) => {
        setSettingsOpen(false);
        setSearchOpen(false);
        setActiveMedia({ type, id, season, episode });

        let mediaSlug: string;
        if (type === "tv" && season && episode) {
          mediaSlug = `series-${id}-${season}-${episode}`;
        } else if (type === "tv") {
          mediaSlug = `series-${id}`;
        } else {
          mediaSlug = `movie-${id}`;
        }

        writeUrl(MEDIA_PARAM, mediaSlug, "push");
        pushedRef.current = true;
      },
      openWatch: (
        type: MediaType,
        id: number | string,
        season?: number,
        episode?: number,
      ) => {
        close();
        router.push(buildMediaWatchUrl(type, id, season, episode));
      },
      close,
    }),
    [close, router],
  );

  return (
    <OverlayContext.Provider value={api}>
      <div className="flex min-h-dvh flex-col">{children}</div>
      <SettingsModal open={settingsOpen} onClose={closeSettings} />
      <SearchModal open={searchOpen} onClose={closeSearch} />
      <AnimatePresence>
        {activeMedia && (
          <MediaDrawer
            key={`${activeMedia.type}-${activeMedia.id}`}
            media={activeMedia}
            onClose={closeMedia}
            onSelectMedia={(type, id) => api.openMedia(type, id)}
          />
        )}
      </AnimatePresence>
    </OverlayContext.Provider>
  );
}
