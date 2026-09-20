"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  FastForward,
  Loader2,
  LogOut,
  Palette,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Unlink,
} from "lucide-react";
import {
  DEFAULT_THEINTRODB_COLORS,
  useConnectionsStore,
} from "@/lib/store/useConnectionsStore";
import { useLibraryStore } from "@/lib/store/useLibraryStore";
import { useHydrated } from "@/lib/store/usePlayerStore";
import { Toggle } from "@/components/ui/SettingControls";
import { cn } from "@/lib/utils";

import { syncBulkToIntegrations } from "@/lib/sync/syncEngine";
import { isOAuthConfigured, OAUTH_CLIENT_IDS, OAUTH_REDIRECT_URI } from "@/lib/siteConfig";

function TheIntroDbLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="100 1200 950.1 250"
      className={className}
      aria-label="TheIntroDB"
    >
      <defs>
        <linearGradient id="tidbLogoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#05df72" />
          <stop offset="100%" stopColor="#00c950" />
        </linearGradient>
      </defs>
      <path
        id="Small-Logo"
        fill="url(#tidbLogoGradient)"
        strokeWidth="1"
        fillRule="evenodd"
        d="M 800.00,1200.00
           C 800.00,1200.00 800.00,1450.00 800.00,1450.00
             800.00,1450.00 900.00,1450.00 950.00,1450.00
             1000.00,1450.00 1050.00,1450.00 1050.00,1375.00
             1050.00,1350.00 1037.50,1325.00 1012.50,1325.00
             1037.50,1325.00 1050.10,1300.93 1050.10,1275.93
             1050.10,1201.61 1000.00,1200.00 950.00,1200.00
             900.00,1200.00 800.00,1200.00 800.00,1200.00 Z
           M 850.00,1250.00
           C 850.00,1250.00 900.00,1250.00 950.00,1250.00
             1000.00,1250.00 1000.00,1262.50 1000.00,1275.00
             1000.00,1287.50 1000.00,1293.75 950.00,1293.75
             900.00,1293.75 850.00,1293.75 850.00,1293.75
             850.00,1293.75 850.00,1250.00 850.00,1250.00 Z
           M 850.00,1400.00
           C 850.00,1400.00 900.00,1400.00 950.00,1400.00
             1000.00,1400.00 1000.00,1387.50 1000.00,1375.00
             1000.00,1362.50 1000.00,1356.25 950.00,1356.25
             900.00,1356.25 850.00,1356.25 850.00,1356.25
             850.00,1356.25 850.10,1400.93 850.10,1400.93M 500.00,1200.00
           C 500.00,1200.00 500.00,1450.00 500.00,1450.00
             500.00,1450.00 650.00,1450.00 650.00,1450.00
             650.00,1450.00 750.00,1450.00 750.00,1325.00
             750.00,1200.00 650.00,1200.00 650.00,1200.00
             650.00,1200.00 500.00,1200.00 500.00,1200.00 Z
           M 550.00,1250.00
           C 550.00,1250.00 550.00,1400.00 550.00,1400.00
             550.00,1400.00 650.00,1400.00 650.00,1400.00
             650.00,1400.00 700.00,1400.00 700.00,1325.00
             700.00,1250.00 650.00,1250.00 650.00,1250.00
             650.00,1250.00 550.00,1250.00 550.00,1250.00 Z
           M 400.00,1200.00
           C 400.00,1200.00 400.00,1450.00 400.00,1450.00
             400.00,1450.00 450.00,1450.00 450.00,1450.00
             450.00,1450.00 450.00,1200.00 450.00,1200.00
             450.00,1200.00 400.00,1200.00 400.00,1200.00 Z
           M 350.00,1200.00
           C 350.00,1200.00 100.00,1200.00 100.00,1200.00
             100.00,1200.00 100.00,1250.00 100.00,1250.00
             100.00,1250.00 200.00,1250.00 200.00,1250.00
             200.00,1250.00 200.00,1450.00 200.00,1450.00
             200.00,1450.00 250.00,1450.00 250.00,1450.00
             250.00,1450.00 250.00,1250.00 250.00,1250.00
             250.00,1250.00 350.00,1250.00 350.00,1250.00
             350.00,1250.00 350.00,1200.00 350.00,1200.00 Z"
      />
    </svg>
  );
}

function AvatarDisplay({
  url,
  username,
  service,
  lastSyncAt,
}: {
  url?: string | null;
  username: string;
  service: "trakt" | "simkl" | "mal" | "anilist";
  lastSyncAt?: number | null;
}) {
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [url, lastSyncAt]);

  // Normalize URL in case it's a relative Simkl path or needs formatting
  let resolvedUrl = url ? url.trim() : null;
  if (resolvedUrl && !resolvedUrl.startsWith("http://") && !resolvedUrl.startsWith("https://")) {
    const clean = resolvedUrl.replace(/^\/+/, "");
    resolvedUrl = clean.startsWith("avatars/")
      ? `https://simkl.in/${clean}`
      : `https://simkl.in/avatars/${clean}`;
  }

  // Trakt default-avatar.png is an obsolete broken asset on trakt's CDN
  if (resolvedUrl && resolvedUrl.includes("default-avatar.png")) {
    resolvedUrl = null;
  }

  const initial = username ? username.charAt(0).toUpperCase() : "?";

  if (!resolvedUrl || loadFailed) {
    let bgGradient = "bg-gradient-to-br from-[#8E24AA] to-[#4A148C]";
    if (service === "simkl") bgGradient = "bg-gradient-to-br from-sky-500 to-sky-700";
    else if (service === "mal") bgGradient = "bg-gradient-to-br from-[#2e51a2] to-[#1a3365]";
    else if (service === "anilist") bgGradient = "bg-gradient-to-br from-[#02a9ff] to-[#0b1622]";

    return (
      <div
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-full font-black text-lg text-white shadow-inner border border-white/20",
          bgGradient,
        )}
      >
        {initial}
      </div>
    );
  }


  const cacheBuster = lastSyncAt ? `&v=${lastSyncAt}` : "";
  const proxySrc = `/api/integrations/avatar-proxy?url=${encodeURIComponent(resolvedUrl)}${cacheBuster}`;

  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/5 shadow-md">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={proxySrc}
        alt=""
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setLoadFailed(true)}
        className="size-full object-cover"
      />
    </div>
  );
}

export function ConnectionsPanel() {
  const hydrated = useHydrated();
  const trakt = useConnectionsStore((s) => s.trakt);
  const simkl = useConnectionsStore((s) => s.simkl);
  const mal = useConnectionsStore((s) => s.mal) || { connected: false, accessToken: null, user: null, lastSyncAt: null };
  const anilist = useConnectionsStore((s) => s.anilist) || { connected: false, accessToken: null, user: null, lastSyncAt: null };

  const setTraktConnected = useConnectionsStore((s) => s.setTraktConnected);
  const updateTraktUser = useConnectionsStore((s) => s.updateTraktUser);
  const disconnectTrakt = useConnectionsStore((s) => s.disconnectTrakt);
  const setTraktLastSync = useConnectionsStore((s) => s.setTraktLastSync);

  const setSimklConnected = useConnectionsStore((s) => s.setSimklConnected);
  const updateSimklUser = useConnectionsStore((s) => s.updateSimklUser);
  const disconnectSimkl = useConnectionsStore((s) => s.disconnectSimkl);
  const setSimklLastSync = useConnectionsStore((s) => s.setSimklLastSync);

  const setMalConnected = useConnectionsStore((s) => s.setMalConnected);
  const updateMalUser = useConnectionsStore((s) => s.updateMalUser);
  const disconnectMal = useConnectionsStore((s) => s.disconnectMal);
  const setMalLastSync = useConnectionsStore((s) => s.setMalLastSync);

  const setAniListConnected = useConnectionsStore((s) => s.setAniListConnected);
  const updateAniListUser = useConnectionsStore((s) => s.updateAniListUser);
  const disconnectAniList = useConnectionsStore((s) => s.disconnectAniList);
  const setAniListLastSync = useConnectionsStore((s) => s.setAniListLastSync);

  const theintrodb = useConnectionsStore((s) => s.theintrodb) || {
    enabled: true,
    colors: DEFAULT_THEINTRODB_COLORS,
  };
  const setTheIntroDbEnabled = useConnectionsStore((s) => s.setTheIntroDbEnabled);
  const setTheIntroDbColor = useConnectionsStore((s) => s.setTheIntroDbColor);
  const resetTheIntroDbColors = useConnectionsStore((s) => s.resetTheIntroDbColors);
  const [colorsExpanded, setColorsExpanded] = useState(false);

  // Auto-refresh profiles on mount if connected to pick up avatar changes
  useEffect(() => {
    if (trakt.connected && trakt.accessToken) {
      fetch("/api/integrations/trakt/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: trakt.accessToken }),
      })
        .then((r) => r.json())
        .then((userData) => {
          if (userData?.username) {
            updateTraktUser({
              username: userData.username,
              name: userData.name || userData.username,
              avatarUrl: userData.avatarUrl || null,
            });
          }
        })
        .catch(() => {});
    }

    if (simkl.connected && simkl.accessToken) {
      fetch("/api/integrations/simkl/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: simkl.accessToken }),
      })
        .then((r) => r.json())
        .then((userData) => {
          if (userData?.username) {
            updateSimklUser({
              username: userData.username,
              name: userData.name || userData.username,
              avatarUrl: userData.avatarUrl || null,
            });
          }
        })
        .catch(() => {});
    }

    if (mal?.connected && mal.accessToken) {
      fetch("/api/integrations/mal/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: mal.accessToken }),
      })
        .then((r) => r.json())
        .then((userData) => {
          if (userData?.username) {
            updateMalUser({
              username: userData.username,
              name: userData.name || userData.username,
              avatarUrl: userData.avatarUrl || null,
            });
          }
        })
        .catch(() => {});
    }

    if (anilist?.connected && anilist.accessToken) {
      fetch("/api/integrations/anilist/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: anilist.accessToken }),
      })
        .then((r) => r.json())
        .then((userData) => {
          if (userData?.username) {
            updateAniListUser({
              username: userData.username,
              name: userData.name || userData.username,
              avatarUrl: userData.avatarUrl || null,
            });
          }
        })
        .catch(() => {});
    }
  }, [
    trakt.connected,
    trakt.accessToken,
    simkl.connected,
    simkl.accessToken,
    mal?.connected,
    mal?.accessToken,
    anilist?.connected,
    anilist?.accessToken,
    updateTraktUser,
    updateSimklUser,
    updateMalUser,
    updateAniListUser,
  ]);


  // Local state for Trakt authentication
  const [traktAuth, setTraktAuth] = useState<{
    device_code: string;
    user_code: string;
    verification_url: string;
    interval: number;
    expires_in: number;
  } | null>(null);
  const [traktLoading, setTraktLoading] = useState(false);
  const [traktCopied, setTraktCopied] = useState(false);
  const [traktSyncing, setTraktSyncing] = useState(false);
  const [traktSyncMsg, setTraktSyncMsg] = useState<string | null>(null);

  // Local state for Simkl authentication
  const [simklAuth, setSimklAuth] = useState<{
    user_code: string;
    verification_url: string;
    interval: number;
    expires_in: number;
  } | null>(null);
  const [simklLoading, setSimklLoading] = useState(false);
  const [simklCopied, setSimklCopied] = useState(false);
  const [simklSyncing, setSimklSyncing] = useState(false);
  const [simklSyncMsg, setSimklSyncMsg] = useState<string | null>(null);

  // Trakt Polling
  useEffect(() => {
    if (!traktAuth) return;

    let active = true;
    const intervalTime = Math.max(5, traktAuth.interval || 5) * 1000;

    const poller = setInterval(async () => {
      try {
        const res = await fetch("/api/integrations/trakt/device-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_code: traktAuth.device_code }),
        });

        if (!active) return;
        const json = await res.json();

        if (json.status === "SUCCESS" && json.data?.access_token) {
          clearInterval(poller);
          setTraktAuth(null);
          setTraktLoading(true);

          // Fetch user profile
          const userRes = await fetch("/api/integrations/trakt/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: json.data.access_token }),
          });

          const userData = await userRes.json();
          setTraktConnected({
            accessToken: json.data.access_token,
            refreshToken: json.data.refresh_token,
            expiresAt: Date.now() + (json.data.expires_in || 7776000) * 1000,
            user: {
              username: userData.username || "Trakt User",
              name: userData.name || userData.username,
              avatarUrl: userData.avatarUrl || null,
            },
          });
          setTraktLoading(false);

          // Initial sync of local watchlist/history
          const { watchlist, history } = useLibraryStore.getState();
          syncBulkToIntegrations(watchlist, history, "trakt").catch(() => {});
        } else if (json.status === "EXPIRED" || json.status === "DENIED") {
          clearInterval(poller);
          setTraktAuth(null);
          setTraktLoading(false);
        }
      } catch {
        // Polling retry
      }
    }, intervalTime);

    return () => {
      active = false;
      clearInterval(poller);
    };
  }, [traktAuth, setTraktConnected]);

  // Simkl Polling
  useEffect(() => {
    if (!simklAuth) return;

    let active = true;
    const intervalTime = Math.max(5, simklAuth.interval || 5) * 1000;

    const poller = setInterval(async () => {
      try {
        const res = await fetch("/api/integrations/simkl/pin-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_code: simklAuth.user_code }),
        });

        if (!active) return;
        const json = await res.json();

        if (json.status === "SUCCESS" && json.access_token) {
          clearInterval(poller);
          setSimklAuth(null);
          setSimklLoading(true);

          // Fetch user profile
          const userRes = await fetch("/api/integrations/simkl/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: json.access_token }),
          });

          const userData = await userRes.json();
          setSimklConnected({
            accessToken: json.access_token,
            user: {
              username: userData.username || "Simkl User",
              name: userData.name || userData.username,
              avatarUrl: userData.avatarUrl || null,
            },
          });
          setSimklLoading(false);

          // Initial sync of local watchlist/history
          const { watchlist, history } = useLibraryStore.getState();
          syncBulkToIntegrations(watchlist, history, "simkl").catch(() => {});
        }
      } catch {
        // Polling retry
      }
    }, intervalTime);

    return () => {
      active = false;
      clearInterval(poller);
    };
  }, [simklAuth, setSimklConnected]);

  // Trakt OAuth2 redirect
  /**
   * A provider with no client ID cannot start an OAuth flow. The authorize URL
   * would carry an empty client_id and the provider answers with its own error
   * page, which reads to a visitor as a broken site rather than an option the
   * operator simply has not set up.
   */
  const oauthReady = {
    trakt: isOAuthConfigured("trakt"),
    simkl: isOAuthConfigured("simkl"),
    mal: isOAuthConfigured("mal"),
    anilist: isOAuthConfigured("anilist"),
  };

  const handleTraktOAuth = () => {
    if (!oauthReady.trakt) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("zenox_oauth_pending", "trakt");
    }
    const clientId = OAUTH_CLIENT_IDS.trakt;
    const redirectUri = encodeURIComponent(OAUTH_REDIRECT_URI);
    const authUrl = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=trakt`;
    window.location.href = authUrl;
  };

  // Simkl OAuth2 redirect
  const handleSimklOAuth = () => {
    if (!oauthReady.simkl) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("zenox_oauth_pending", "simkl");
    }
    const clientId = OAUTH_CLIENT_IDS.simkl;
    const redirectUri = encodeURIComponent(OAUTH_REDIRECT_URI);
    const authUrl = `https://simkl.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=simkl`;
    window.location.href = authUrl;
  };

  // Start Trakt Flow
  const startTraktConnect = async () => {
    if (!oauthReady.trakt) return;
    setTraktLoading(true);
    try {
      const res = await fetch("/api/integrations/trakt/device-code", { method: "POST" });
      const data = await res.json();
      if (data.user_code) {
        setTraktAuth({
          device_code: data.device_code,
          user_code: data.user_code,
          verification_url: data.verification_url || "https://auth.trakt.tv/activate",
          interval: data.interval || 5,
          expires_in: data.expires_in || 600,
        });
      }
    } catch {
      // Error handling
    } finally {
      setTraktLoading(false);
    }
  };

  // Start Simkl Flow
  const startSimklConnect = async () => {
    setSimklLoading(true);
    try {
      const res = await fetch("/api/integrations/simkl/pin", { method: "POST" });
      const data = await res.json();
      if (data.user_code) {
        setSimklAuth({
          user_code: data.user_code,
          verification_url: data.verification_url || "https://simkl.com/pin",
          interval: data.interval || 5,
          expires_in: data.expires_in || 900,
        });
      }
    } catch {
      // Error handling
    } finally {
      setSimklLoading(false);
    }
  };

  // Copy code helper
  const copyCode = (code: string, isTrakt: boolean) => {
    navigator.clipboard.writeText(code);
    if (isTrakt) {
      setTraktCopied(true);
      setTimeout(() => setTraktCopied(false), 2000);
    } else {
      setSimklCopied(true);
      setTimeout(() => setSimklCopied(false), 2000);
    }
  };

  // Trigger manual sync Trakt
  const handleTraktSync = async () => {
    if (!trakt.accessToken) return;
    setTraktSyncing(true);
    setTraktSyncMsg("Syncing with Trakt…");
    try {
      // 1. Re-fetch user profile to immediately pick up newly changed avatars or names
      try {
        const userRes = await fetch("/api/integrations/trakt/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: trakt.accessToken }),
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData?.username) {
            updateTraktUser({
              username: userData.username,
              name: userData.name || userData.username,
              avatarUrl: userData.avatarUrl || null,
            });
          }
        }
      } catch {
        // Continue with library sync even if user profile fetch failed
      }

      // 2. Sync watchlist & history
      const { watchlist, history } = useLibraryStore.getState();
      await syncBulkToIntegrations(watchlist, history, "trakt");
      setTraktLastSync();
      setTraktSyncMsg("Synced successfully with Trakt");
      setTimeout(() => setTraktSyncMsg(null), 3500);
    } catch {
      setTraktSyncMsg("Sync failed. Check connection.");
      setTimeout(() => setTraktSyncMsg(null), 3500);
    } finally {
      setTraktSyncing(false);
    }
  };

  // Trigger manual sync Simkl
  const handleSimklSync = async () => {
    if (!simkl.accessToken) return;
    setSimklSyncing(true);
    setSimklSyncMsg("Checking Simkl activities…");
    try {
      // 1. Re-fetch user profile to immediately pick up newly changed avatars or names
      try {
        const userRes = await fetch("/api/integrations/simkl/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: simkl.accessToken }),
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData?.username) {
            updateSimklUser({
              username: userData.username,
              name: userData.name || userData.username,
              avatarUrl: userData.avatarUrl || null,
            });
          }
        }
      } catch {
        // Continue with library sync even if user profile fetch failed
      }

      // 2. Sync watchlist & history
      const { watchlist, history } = useLibraryStore.getState();
      await syncBulkToIntegrations(watchlist, history, "simkl");
      const actRes = await fetch("/api/integrations/simkl/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: simkl.accessToken,
          action: "get_activities",
        }),
      });
      const activities = await actRes.json();
      setSimklLastSync(Date.now(), activities?.all);
      setSimklSyncMsg("Synced successfully with Simkl");
      setTimeout(() => setSimklSyncMsg(null), 3500);
    } catch {
      setSimklSyncMsg("Sync failed. Check connection.");
      setTimeout(() => setSimklSyncMsg(null), 3500);
    } finally {
      setSimklSyncing(false);
    }
  };

  // Local state for MAL authentication
  const [malSyncing, setMalSyncing] = useState(false);
  const [malSyncMsg, setMalSyncMsg] = useState<string | null>(null);

  // Local state for AniList authentication
  const [aniListSyncing, setAniListSyncing] = useState(false);
  const [aniListSyncMsg, setAniListSyncMsg] = useState<string | null>(null);

  // MAL OAuth2 redirect (PKCE with code_challenge)
  const handleMalOAuth = () => {
    if (!oauthReady.mal) return;
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let verifier = "";
    if (typeof window !== "undefined" && window.crypto) {
      const randomValues = new Uint8Array(64);
      window.crypto.getRandomValues(randomValues);
      for (let i = 0; i < 64; i++) {
        verifier += charset[randomValues[i] % charset.length];
      }
      localStorage.setItem("zenox_mal_code_verifier", verifier);
      localStorage.setItem("zenox_oauth_pending", "mal");
    }
    const clientId = OAUTH_CLIENT_IDS.mal;
    const redirectUri = encodeURIComponent(OAUTH_REDIRECT_URI);
    const authUrl = `https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${clientId}&code_challenge=${verifier}&code_challenge_method=plain&state=mal&redirect_uri=${redirectUri}`;
    window.location.href = authUrl;
  };

  const handleMalSync = async () => {
    if (!mal?.accessToken) return;
    setMalSyncing(true);
    setMalSyncMsg("Syncing anime & continue watching…");
    try {
      const { watchlist, history } = useLibraryStore.getState();
      const result = await syncBulkToIntegrations(watchlist, history, "mal");
      const importedTotal = (result?.importedWatchlist || 0) + (result?.importedHistory || 0);
      if (importedTotal > 0) {
        setMalSyncMsg(`Synced successfully (${importedTotal} anime updated)`);
      } else {
        setMalSyncMsg("Synced successfully with MyAnimeList");
      }
    } catch {
      setMalSyncMsg("Sync failed. Check connection.");
    } finally {
      setMalSyncing(false);
      setTimeout(() => setMalSyncMsg(null), 3500);
    }
  };

  // AniList OAuth2 redirect
  const handleAniListOAuth = () => {
    if (!oauthReady.anilist) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("zenox_oauth_pending", "anilist");
    }
    const clientId = OAUTH_CLIENT_IDS.anilist;
    const redirectUri = encodeURIComponent(OAUTH_REDIRECT_URI);
    const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&state=anilist`;
    window.location.href = authUrl;
  };

  const handleAniListSync = async () => {
    if (!anilist?.accessToken) return;
    setAniListSyncing(true);
    setAniListSyncMsg("Syncing favourites & continue watching…");
    try {
      const { watchlist, history } = useLibraryStore.getState();
      const result = await syncBulkToIntegrations(watchlist, history, "anilist");
      const importedTotal = (result?.importedWatchlist || 0) + (result?.importedHistory || 0);
      if (importedTotal > 0) {
        setAniListSyncMsg(`Synced successfully (${importedTotal} anime updated)`);
      } else {
        setAniListSyncMsg("Synced successfully with AniList");
      }
    } catch {
      setAniListSyncMsg("Sync failed. Check connection.");
    } finally {
      setAniListSyncing(false);
      setTimeout(() => setAniListSyncMsg(null), 3500);
    }
  };



  const formatRelativeTime = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-title-md font-bold text-white">Media Connections</h3>
          <p className="mt-1 text-body-md text-white/60">
            Connect your tracking profiles to automatically synchronize your watch history, in-progress resume points, and favorites.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("theintrodb-card");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-label-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 hover:border-white/25 transition-all active:scale-95 shrink-0 cursor-pointer shadow-sm"
        >
          <span>Bottom</span>
          <ChevronDown className="size-4.5 text-primary" />
        </button>
      </div>


      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* ======================= TRAKT CARD ======================= */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03] p-5 backdrop-blur-md transition-all duration-300 hover:border-white/20">
          {/* Card Header */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative size-10 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src="/brands/trakt.png"
                    alt="Trakt"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-title-sm font-bold text-white">Trakt</h4>
                  <p className="text-label-sm text-white/50">Scrobble & Watchlist</p>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold",
                  trakt.connected
                    ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                    : "border border-white/10 bg-white/5 text-white/50",
                )}
              >
                {trakt.connected ? (
                  <>
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </>
                ) : (
                  "Disconnected"
                )}
              </span>
            </div>

            {/* Content Area */}
            <div className="mt-5">
              {trakt.connected && trakt.user ? (
                /* Connected View */
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <AvatarDisplay
                      url={trakt.user.avatarUrl}
                      username={trakt.user.username}
                      service="trakt"
                      lastSyncAt={trakt.lastSyncAt}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white text-label-md">
                        {trakt.user.name || trakt.user.username}
                      </p>
                      <p className="truncate text-[12px] text-white/50">@{trakt.user.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-white/50 px-1">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      Last synced: {formatRelativeTime(trakt.lastSyncAt)}
                    </span>
                    {traktSyncMsg && <span className="text-primary font-medium">{traktSyncMsg}</span>}
                  </div>
                </div>
              ) : traktAuth ? (
                /* Device Code Authorization View */
                <div className="space-y-4 rounded-xl border border-white/15 bg-black/60 p-4">
                  <div className="text-center">
                    <p className="text-label-sm text-white/70">
                      1. Open Trakt activation link:
                    </p>
                    <a
                      href={traktAuth.verification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-3.5 py-1 text-label-sm font-semibold text-primary hover:bg-primary/25 transition-colors"
                    >
                      auth.trakt.tv/activate
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>

                  <div className="text-center pt-1">
                    <p className="text-label-sm text-white/70">2. Enter this code:</p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 font-mono text-xl font-bold tracking-widest text-white shadow-inner">
                        {traktAuth.user_code}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyCode(traktAuth.user_code, true)}
                        title="Copy code"
                        className="grid size-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20 transition-colors"
                      >
                        {traktCopied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-[12px] text-white/50 pt-1">
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                    <span>Waiting for approval on Trakt…</span>
                  </div>

                  <div className="flex items-center justify-between text-[12px] pt-1">
                    <button
                      type="button"
                      onClick={() => setTraktAuth(null)}
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTraktAuth(null);
                        handleTraktOAuth();
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Use OAuth instead
                    </button>
                  </div>
                </div>
              ) : (
                /* Default Disconnected View */
                <p className="text-label-md text-white/60 leading-relaxed">
                  Connect your Trakt account to automatically scrobble your viewing history and sync bookmarks across all your devices.
                </p>
              )}
            </div>
          </div>

          {/* Card Footer Actions */}
          <div className="mt-6 border-t border-white/10 pt-4">
            {trakt.connected ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTraktSync}
                  disabled={traktSyncing}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-label-sm font-semibold text-white transition-colors hover:bg-white/20 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", traktSyncing && "animate-spin text-primary")} />
                  {traktSyncing ? "Syncing…" : "Sync Now"}
                </button>

                <button
                  type="button"
                  onClick={disconnectTrakt}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-label-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 active:scale-95"
                >
                  <Unlink className="size-3.5" />
                  Disconnect
                </button>
              </div>
            ) : !traktAuth ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleTraktOAuth}
                  disabled={!oauthReady.trakt}
                  title={oauthReady.trakt ? undefined : "Trakt sign-in is not configured on this server"}
                  className={
                    oauthReady.trakt
                      ? "w-full rounded-full bg-primary py-2.5 text-center text-label-md font-bold text-on-primary transition-all hover:bg-primary-hover active:scale-98 shadow-md shadow-primary/20"
                      : "w-full cursor-not-allowed rounded-full border border-white/10 bg-white/5 py-2.5 text-center text-label-md font-semibold text-white/30"
                  }
                >
                  {oauthReady.trakt ? "Connect Trakt" : "Trakt not configured"}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={startTraktConnect}
                    disabled={traktLoading}
                    className="inline-flex items-center gap-1.5 text-label-sm text-white/50 hover:text-white transition-colors"
                  >
                    {traktLoading ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="size-3 animate-spin" />
                        Generating code…
                      </span>
                    ) : (
                      "Use code instead"
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* ======================= SIMKL CARD ======================= */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03] p-5 backdrop-blur-md transition-all duration-300 hover:border-white/20">
          {/* Card Header */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-8 w-24 shrink-0">
                  <Image
                    src="/brands/simkl.png"
                    alt="Simkl"
                    fill
                    className="object-contain object-left"
                  />
                </div>
                <div>
                  <h4 className="text-title-sm font-bold text-white">Simkl</h4>
                  <p className="text-label-sm text-white/50">Anime, Shows & Movies</p>
                </div>
              </div>


              {/* Status Badge */}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold",
                  simkl.connected
                    ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                    : "border border-white/10 bg-white/5 text-white/50",
                )}
              >
                {simkl.connected ? (
                  <>
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </>
                ) : (
                  "Disconnected"
                )}
              </span>
            </div>

            {/* Content Area */}
            <div className="mt-5">
              {simkl.connected && simkl.user ? (
                /* Connected View */
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <AvatarDisplay
                      url={simkl.user.avatarUrl}
                      username={simkl.user.username}
                      service="simkl"
                      lastSyncAt={simkl.lastSyncAt}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white text-label-md">
                        {simkl.user.name || simkl.user.username}
                      </p>
                      <p className="truncate text-[12px] text-white/50">@{simkl.user.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-white/50 px-1">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      Last synced: {formatRelativeTime(simkl.lastSyncAt)}
                    </span>
                    {simklSyncMsg && <span className="text-primary font-medium">{simklSyncMsg}</span>}
                  </div>
                </div>
              ) : simklAuth ? (
                /* PIN Code Authorization View */
                <div className="space-y-4 rounded-xl border border-white/15 bg-black/60 p-4">
                  <div className="text-center">
                    <p className="text-label-sm text-white/70">
                      1. Open Simkl PIN activation page:
                    </p>
                    <a
                      href={simklAuth.verification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/15 px-3.5 py-1 text-label-sm font-semibold text-sky-400 hover:bg-sky-400/25 transition-colors"
                    >
                      simkl.com/pin
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>

                  <div className="text-center pt-1">
                    <p className="text-label-sm text-white/70">2. Enter code:</p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 font-mono text-xl font-bold tracking-widest text-white shadow-inner">
                        {simklAuth.user_code}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyCode(simklAuth.user_code, false)}
                        title="Copy code"
                        className="grid size-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20 transition-colors"
                      >
                        {simklCopied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[12px] pt-1">
                    <button
                      type="button"
                      onClick={() => setSimklAuth(null)}
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSimklAuth(null);
                        handleSimklOAuth();
                      }}
                      className="text-sky-400 hover:underline font-medium"
                    >
                      Use OAuth instead
                    </button>
                  </div>
                </div>
              ) : (
                /* Default Disconnected View */
                <p className="text-label-md text-white/60 leading-relaxed">
                  Connect your Simkl account to synchronize watchlists and movie/series history with Simkl cloud tracking.
                </p>
              )}
            </div>
          </div>

          {/* Card Footer Actions */}
          <div className="mt-6 border-t border-white/10 pt-4">
            {simkl.connected ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSimklSync}
                  disabled={simklSyncing}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-label-sm font-semibold text-white transition-colors hover:bg-white/20 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", simklSyncing && "animate-spin text-primary")} />
                  {simklSyncing ? "Syncing…" : "Sync Now"}
                </button>

                <button
                  type="button"
                  onClick={disconnectSimkl}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-label-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 active:scale-95"
                >
                  <Unlink className="size-3.5" />
                  Disconnect
                </button>
              </div>
            ) : !simklAuth ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleSimklOAuth}
                  disabled={!oauthReady.simkl}
                  title={oauthReady.simkl ? undefined : "Simkl sign-in is not configured on this server"}
                  className={
                    oauthReady.simkl
                      ? "w-full rounded-full bg-primary py-2.5 text-center text-label-md font-bold text-on-primary transition-all hover:bg-primary-hover active:scale-98 shadow-md shadow-primary/20"
                      : "w-full cursor-not-allowed rounded-full border border-white/10 bg-white/5 py-2.5 text-center text-label-md font-semibold text-white/30"
                  }
                >
                  {oauthReady.simkl ? "Connect Simkl" : "Simkl not configured"}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={startSimklConnect}
                    disabled={simklLoading}
                    className="inline-flex items-center gap-1.5 text-label-sm text-white/50 hover:text-white transition-colors"
                  >
                    {simklLoading ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="size-3 animate-spin" />
                        Generating PIN…
                      </span>
                    ) : (
                      "Use code instead"
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* ======================= MYANIMELIST CARD ======================= */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03] p-5 backdrop-blur-md transition-all duration-300 hover:border-white/20">
          {/* Card Header */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative size-10 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src="/brands/mal.png"
                    alt="MyAnimeList"
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-title-sm font-bold text-white">MyAnimeList</h4>
                  <p className="text-label-sm text-white/50">Anime & Manga Scrobbler</p>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold",
                  mal?.connected
                    ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                    : "border border-white/10 bg-white/5 text-white/50",
                )}
              >
                {mal?.connected ? (
                  <>
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </>
                ) : (
                  "Disconnected"
                )}
              </span>
            </div>

            {/* Content Area */}
            <div className="mt-5">
              {mal?.connected && mal.user ? (
                /* Connected View */
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <AvatarDisplay
                      url={mal.user.avatarUrl}
                      username={mal.user.username}
                      service="mal"
                      lastSyncAt={mal.lastSyncAt}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white text-label-md">
                        {mal.user.name || mal.user.username}
                      </p>
                      <p className="truncate text-[12px] text-white/50">@{mal.user.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-white/50 px-1">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      Last synced: {formatRelativeTime(mal.lastSyncAt)}
                    </span>
                    {malSyncMsg && <span className="text-primary font-medium">{malSyncMsg}</span>}
                  </div>
                </div>
              ) : (
                /* Default Disconnected View */
                <p className="text-label-md text-white/60 leading-relaxed">
                  Connect your MyAnimeList account to automatically track your watched anime episodes, plan-to-watch queue, and scores.
                </p>
              )}
            </div>
          </div>

          {/* Card Footer Actions */}
          <div className="mt-6 border-t border-white/10 pt-4">
            {mal?.connected ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleMalSync}
                  disabled={malSyncing}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-label-sm font-semibold text-white transition-colors hover:bg-white/20 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", malSyncing && "animate-spin text-primary")} />
                  {malSyncing ? "Syncing…" : "Sync Now"}
                </button>

                <button
                  type="button"
                  onClick={disconnectMal}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-label-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 active:scale-95"
                >
                  <Unlink className="size-3.5" />
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleMalOAuth}
                disabled={!oauthReady.mal}
                title={oauthReady.mal ? undefined : "MyAnimeList sign-in is not configured on this server"}
                className={
                  oauthReady.mal
                    ? "w-full rounded-full bg-primary py-2.5 text-center text-label-md font-bold text-on-primary transition-all hover:bg-primary-hover active:scale-98 shadow-md shadow-primary/20"
                    : "w-full cursor-not-allowed rounded-full border border-white/10 bg-white/5 py-2.5 text-center text-label-md font-semibold text-white/30"
                }
              >
                {oauthReady.mal ? "Connect MyAnimeList" : "MyAnimeList not configured"}
              </button>
            )}
          </div>
        </div>

        {/* ======================= ANILIST CARD ======================= */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03] p-5 backdrop-blur-md transition-all duration-300 hover:border-white/20">
          {/* Card Header */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative size-10 shrink-0">
                  <Image
                    src="/brands/anilist.svg"
                    alt="AniList"
                    fill
                    className="object-contain"
                  />
                </div>
                <div>
                  <h4 className="text-title-sm font-bold text-white">AniList</h4>
                  <p className="text-label-sm text-white/50">Anime & Manga Tracking</p>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold",
                  anilist?.connected
                    ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                    : "border border-white/10 bg-white/5 text-white/50",
                )}
              >
                {anilist?.connected ? (
                  <>
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </>
                ) : (
                  "Disconnected"
                )}
              </span>
            </div>

            {/* Content Area */}
            <div className="mt-5">
              {anilist?.connected && anilist.user ? (
                /* Connected View */
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <AvatarDisplay
                      url={anilist.user.avatarUrl}
                      username={anilist.user.username}
                      service="anilist"
                      lastSyncAt={anilist.lastSyncAt}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white text-label-md">
                        {anilist.user.name || anilist.user.username}
                      </p>
                      <p className="truncate text-[12px] text-white/50">@{anilist.user.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-white/50 px-1">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" />
                      Last synced: {formatRelativeTime(anilist.lastSyncAt)}
                    </span>
                    {aniListSyncMsg && <span className="text-primary font-medium">{aniListSyncMsg}</span>}
                  </div>
                </div>
              ) : (
                /* Default Disconnected View */
                <p className="text-label-md text-white/60 leading-relaxed">
                  Connect your AniList profile to synchronize your anime watch history, ratings, and media lists with AniList cloud.
                </p>
              )}
            </div>
          </div>

          {/* Card Footer Actions */}
          <div className="mt-6 border-t border-white/10 pt-4">
            {anilist?.connected ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleAniListSync}
                  disabled={aniListSyncing}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-label-sm font-semibold text-white transition-colors hover:bg-white/20 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", aniListSyncing && "animate-spin text-primary")} />
                  {aniListSyncing ? "Syncing…" : "Sync Now"}
                </button>

                <button
                  type="button"
                  onClick={disconnectAniList}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-label-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 active:scale-95"
                >
                  <Unlink className="size-3.5" />
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAniListOAuth}
                disabled={!oauthReady.anilist}
                title={oauthReady.anilist ? undefined : "AniList sign-in is not configured on this server"}
                className={
                  oauthReady.anilist
                    ? "w-full rounded-full bg-primary py-2.5 text-center text-label-md font-bold text-on-primary transition-all hover:bg-primary-hover active:scale-98 shadow-md shadow-primary/20"
                    : "w-full cursor-not-allowed rounded-full border border-white/10 bg-white/5 py-2.5 text-center text-label-md font-semibold text-white/30"
                }
              >
                {oauthReady.anilist ? "Connect AniList" : "AniList not configured"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================= THE INTRO DATABASE (TIDB) ======================= */}
      <div id="theintrodb-card" className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.03] p-5 backdrop-blur-md transition-all duration-300 hover:border-white/20 scroll-mt-6">

        {/* Header & Main Toggle */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-3.5">
            {/* TheIntroDB Official Brand Logo */}
            <div className="relative shrink-0 flex items-center">
              <TheIntroDbLogo className="h-7 w-auto" />
            </div>
            <div>
              <h4 className="text-title-sm font-bold text-white">The Intro Database (TIDB)</h4>
              <p className="text-label-sm text-white/50 mt-0.5">
                Community timestamps to automatically skip intros, recaps, credits, and previews.
              </p>
            </div>
          </div>


          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            {theintrodb.enabled && (
              <button
                type="button"
                onClick={() => setColorsExpanded((prev) => !prev)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer",
                  colorsExpanded
                    ? "border-white/25 bg-white/15 text-white shadow-sm"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white",
                )}
                title={colorsExpanded ? "Hide timeline colors" : "Customize timeline colors"}
              >
                <Palette className="size-3.5" />
                <span>Colors</span>
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    colorsExpanded && "rotate-180",
                  )}
                />
              </button>
            )}
            <span className="text-label-sm font-semibold text-white/70">
              {theintrodb.enabled ? "Enabled" : "Disabled"}
            </span>
            <Toggle
              id="theintrodb-toggle"
              checked={theintrodb.enabled}
              onChange={(val) => setTheIntroDbEnabled(val)}
              label="TheIntroDB"
            />
          </div>
        </div>

        {/* Customization Details (Expandable when enabled) */}
        <AnimatePresence>
          {theintrodb.enabled && colorsExpanded && (
            <motion.div
              key="tidb-colors-expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h5 className="text-label-md font-bold text-white">Player Slider Segment Colors</h5>
                    <p className="text-[12px] text-white/50">
                      Customize the highlight colors displayed on the videoplayer timeline.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetTheIntroDbColors}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/75 transition-all hover:bg-white/15 hover:text-white active:scale-95"
                  >
                    <RotateCcw className="size-3" />
                    Reset Defaults
                  </button>
                </div>

                {/* 4 Segment Color Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Intro Color */}
                  <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Intro</span>
                      <div
                        className="size-3.5 rounded-full border border-white/30 shadow-sm"
                        style={{ backgroundColor: theintrodb.colors.intro }}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        aria-label="Intro segment color"
                        value={theintrodb.colors.intro}
                        onChange={(e) => setTheIntroDbColor("intro", e.target.value)}
                        className="size-7 cursor-pointer appearance-none rounded-lg border border-white/20 bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        aria-label="Intro segment color hex"
                        value={theintrodb.colors.intro}
                        onChange={(e) => setTheIntroDbColor("intro", e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] font-bold text-white focus:border-white/30 focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  {/* Recap Color */}
                  <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Recap</span>
                      <div
                        className="size-3.5 rounded-full border border-white/30 shadow-sm"
                        style={{ backgroundColor: theintrodb.colors.recap }}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        aria-label="Recap segment color"
                        value={theintrodb.colors.recap}
                        onChange={(e) => setTheIntroDbColor("recap", e.target.value)}
                        className="size-7 cursor-pointer appearance-none rounded-lg border border-white/20 bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        aria-label="Recap segment color hex"
                        value={theintrodb.colors.recap}
                        onChange={(e) => setTheIntroDbColor("recap", e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] font-bold text-white focus:border-white/30 focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  {/* Credits / Outro Color */}
                  <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Credits / Next</span>
                      <div
                        className="size-3.5 rounded-full border border-white/30 shadow-sm"
                        style={{ backgroundColor: theintrodb.colors.credits }}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        aria-label="Credits segment color"
                        value={theintrodb.colors.credits}
                        onChange={(e) => setTheIntroDbColor("credits", e.target.value)}
                        className="size-7 cursor-pointer appearance-none rounded-lg border border-white/20 bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        aria-label="Credits segment color hex"
                        value={theintrodb.colors.credits}
                        onChange={(e) => setTheIntroDbColor("credits", e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] font-bold text-white focus:border-white/30 focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  {/* Preview Color */}
                  <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Preview</span>
                      <div
                        className="size-3.5 rounded-full border border-white/30 shadow-sm"
                        style={{ backgroundColor: theintrodb.colors.preview }}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        aria-label="Preview segment color"
                        value={theintrodb.colors.preview}
                        onChange={(e) => setTheIntroDbColor("preview", e.target.value)}
                        className="size-7 cursor-pointer appearance-none rounded-lg border border-white/20 bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        aria-label="Preview segment color hex"
                        value={theintrodb.colors.preview}
                        onChange={(e) => setTheIntroDbColor("preview", e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] font-bold text-white focus:border-white/30 focus:outline-none uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Mock Timeline Slider Preview */}
                <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/50 mb-2">
                    <span>Timeline Preview</span>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: theintrodb.colors.recap }} />
                        Recap
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: theintrodb.colors.intro }} />
                        Intro
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: theintrodb.colors.preview }} />
                        Preview
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: theintrodb.colors.credits }} />
                        Credits
                      </span>
                    </div>
                  </div>

                  {/* Mock Bar */}
                  <div className="relative h-2 w-full rounded-full bg-white/15 overflow-hidden">
                    {/* Played progress */}
                    <div className="absolute inset-y-0 left-0 w-[28%] bg-white/40 rounded-full" />

                    {/* Recap Segment (1% to 8%) */}
                    <div
                      className="absolute inset-y-0 opacity-90 rounded-sm shadow-sm"
                      style={{
                        left: "2%",
                        width: "7%",
                        backgroundColor: theintrodb.colors.recap,
                      }}
                    />

                    {/* Intro Segment (12% to 22%) */}
                    <div
                      className="absolute inset-y-0 opacity-90 rounded-sm shadow-sm"
                      style={{
                        left: "12%",
                        width: "10%",
                        backgroundColor: theintrodb.colors.intro,
                      }}
                    />

                    {/* Preview Segment (60% to 65%) */}
                    <div
                      className="absolute inset-y-0 opacity-90 rounded-sm shadow-sm"
                      style={{
                        left: "60%",
                        width: "6%",
                        backgroundColor: theintrodb.colors.preview,
                      }}
                    />

                    {/* Credits / Outro Segment (88% to 98%) */}
                    <div
                      className="absolute inset-y-0 opacity-90 rounded-sm shadow-sm"
                      style={{
                        left: "88%",
                        width: "10%",
                        backgroundColor: theintrodb.colors.credits,
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
