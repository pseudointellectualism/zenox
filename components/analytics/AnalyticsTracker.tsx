"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const PING_INTERVAL_MS = 25_000; // 25 seconds heartbeat
const STORAGE_KEY = "zenox_analytics_sid";

function randomId(): string {
  return "s_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now().toString(36);
}

/**
 * A random, first-party visitor id. It identifies a browser, not a person, and
 * carries nothing derived from the visitor.
 *
 * Held in localStorage rather than sessionStorage so it survives a reload and
 * is shared across tabs. sessionStorage is scoped to one tab, which meant the
 * same person counted once per tab and again after every reopen, making a
 * daily unique count impossible to state honestly. Falls back to sessionStorage
 * and then to memory where storage is unavailable or blocked.
 */
function getOrGenerateSessionId(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = randomId();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // Private mode or blocked site data.
  }

  try {
    const existing = window.sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = randomId();
    window.sessionStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return "s_anon_" + Math.random().toString(36).substring(2, 10);
  }
}

function detectDevice(): "desktop" | "mobile" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(ua)) {
    return "tablet";
  }
  if (/(mobi|ipod|phone|blackberry|opera mini|fennec|minimo)/.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sendPing = (pathOverride?: string) => {
    const currentPath = pathOverride || pathname || "/";
    // Never track admin panel views
    if (currentPath.startsWith("/admin")) return;

    const sid = sessionIdRef.current || getOrGenerateSessionId();
    if (!sid) return;

    const payload = JSON.stringify({
      sessionId: sid,
      route: currentPath,
      title: typeof document !== "undefined" ? document.title : undefined,
      device: detectDevice(),
    });

    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/analytics/ping", blob);
      } else {
        fetch("/api/analytics/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Ignore network errors on background heartbeat
    }
  };

  useEffect(() => {
    sessionIdRef.current = getOrGenerateSessionId();

    // Initial ping on mount or route transition
    sendPing();

    // Regular interval heartbeat
    intervalRef.current = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        sendPing();
      }
    }, PING_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendPing();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname]);

  return null;
}
