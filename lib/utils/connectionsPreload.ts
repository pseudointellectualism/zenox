import { useConnectionsStore } from "@/lib/store/useConnectionsStore";

function preloadImage(src: string) {
  if (typeof window === "undefined" || !src) return;
  try {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = src;
  } catch {
    // ignore preload errors
  }
}

function resolveAvatarUrl(url?: string | null, service: "trakt" | "simkl" = "trakt") {
  if (!url) return null;
  let resolved = url.trim();
  if (resolved.includes("default-avatar.png")) return null;

  if (service === "simkl") {
    if (!resolved.startsWith("http://") && !resolved.startsWith("https://")) {
      const clean = resolved.replace(/^\/+/, "");
      resolved = clean.startsWith("avatars/")
        ? `https://simkl.in/${clean}`
        : `https://simkl.in/avatars/${clean}`;
    }
  }

  return `/api/integrations/avatar-proxy?url=${encodeURIComponent(resolved)}`;
}

let lastPreloadTime = 0;

/**
 * Preload Trakt & Simkl brand icons, user details, and profile pictures
 * so when the user opens Settings -> Connections, everything is already loaded instantly.
 */
export function preloadConnections() {
  if (typeof window === "undefined") return;

  // 1. Immediately preload brand icons
  preloadImage("/brands/trakt.png");
  preloadImage("/brands/simkl.png");
  preloadImage("/brands/mal.png");
  preloadImage("/brands/anilist.svg");

  // Debounce API calls by at least 15 seconds so we don't spam endpoints
  const now = Date.now();
  const shouldFetchApi = now - lastPreloadTime > 15000;
  if (shouldFetchApi) {
    lastPreloadTime = now;
  }

  const {
    trakt,
    simkl,
    mal,
    anilist,
    updateTraktUser,
    updateSimklUser,
    updateMalUser,
    updateAniListUser,
  } = useConnectionsStore.getState();

  // 2. Preload existing cached avatars immediately
  if (trakt?.connected && trakt.user?.avatarUrl) {
    const traktSrc = resolveAvatarUrl(trakt.user.avatarUrl, "trakt");
    if (traktSrc) preloadImage(traktSrc);
  }

  if (simkl?.connected && simkl.user?.avatarUrl) {
    const simklSrc = resolveAvatarUrl(simkl.user.avatarUrl, "simkl");
    if (simklSrc) preloadImage(simklSrc);
  }

  if (mal?.connected && mal.user?.avatarUrl) {
    const malSrc = resolveAvatarUrl(mal.user.avatarUrl, "trakt");
    if (malSrc) preloadImage(malSrc);
  }

  if (anilist?.connected && anilist.user?.avatarUrl) {
    const anilistSrc = resolveAvatarUrl(anilist.user.avatarUrl, "trakt");
    if (anilistSrc) preloadImage(anilistSrc);
  }

  if (!shouldFetchApi) return;

  // 3. Background fresh fetch for Trakt profile if connected
  if (trakt?.connected && trakt.accessToken) {
    fetch("/api/integrations/trakt/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: trakt.accessToken }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((userData) => {
        if (userData?.username) {
          updateTraktUser({
            username: userData.username,
            name: userData.name || userData.username,
            avatarUrl: userData.avatarUrl || null,
          });
          if (userData.avatarUrl) {
            const src = resolveAvatarUrl(userData.avatarUrl, "trakt");
            if (src) preloadImage(src);
          }
        }
      })
      .catch(() => {});
  }

  // 4. Background fresh fetch for Simkl profile if connected
  if (simkl?.connected && simkl.accessToken) {
    fetch("/api/integrations/simkl/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: simkl.accessToken }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((userData) => {
        if (userData?.username) {
          updateSimklUser({
            username: userData.username,
            name: userData.name || userData.username,
            avatarUrl: userData.avatarUrl || null,
          });
          if (userData.avatarUrl) {
            const src = resolveAvatarUrl(userData.avatarUrl, "simkl");
            if (src) preloadImage(src);
          }
        }
      })
      .catch(() => {});
  }

  // 5. Background fresh fetch for MAL profile if connected
  if (mal?.connected && mal.accessToken) {
    fetch("/api/integrations/mal/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: mal.accessToken }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((userData) => {
        if (userData?.username) {
          updateMalUser({
            username: userData.username,
            name: userData.name || userData.username,
            avatarUrl: userData.avatarUrl || null,
          });
          if (userData.avatarUrl) {
            const src = resolveAvatarUrl(userData.avatarUrl, "trakt");
            if (src) preloadImage(src);
          }
        }
      })
      .catch(() => {});
  }

  // 6. Background fresh fetch for AniList profile if connected
  if (anilist?.connected && anilist.accessToken) {
    fetch("/api/integrations/anilist/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: anilist.accessToken }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((userData) => {
        if (userData?.username) {
          updateAniListUser({
            username: userData.username,
            name: userData.name || userData.username,
            avatarUrl: userData.avatarUrl || null,
          });
          if (userData.avatarUrl) {
            const src = resolveAvatarUrl(userData.avatarUrl, "trakt");
            if (src) preloadImage(src);
          }
        }
      })
      .catch(() => {});
  }
}

