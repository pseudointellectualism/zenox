import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSessionFromCookies } from "@/lib/server/adminAuth";
import { verifyPassword } from "@/lib/server/passwordHash";
import {
  getSystemConfig,
  updateSystemConfig,
  getNotifications,
  fetchNotificationsAsync,
  addNotification,
  addNotificationAsync,
  deleteNotification,
  deleteNotificationAsync,
  getAdminLogs,
  logAdminAction,
  exportFullBackup,
} from "@/lib/server/systemConfigStore";

export const dynamic = "force-dynamic";

interface CachedHealth {
  tmdb: { status: "operational" | "degraded" | "error"; latencyMs: number };
  vps: { status: "operational" | "degraded" | "error" | "unconfigured"; latencyMs: number; url: string | null };
  timestamp: number;
}

let cachedNetworkHealth: CachedHealth | null = null;
const HEALTH_CACHE_TTL_MS = 60 * 1000; // 60 seconds rate limit to avoid overloading Scraper VPS

/**
 * Checks system health: TMDB API and Scraper VPS with 60s rate limit
 */
async function checkSystemHealth(force = false) {
  const now = Date.now();
  let networkHealth = cachedNetworkHealth;

  if (force || !networkHealth || now - networkHealth.timestamp > HEALTH_CACHE_TTL_MS) {
    const startTmdb = Date.now();
    let tmdbStatus: "operational" | "degraded" | "error" = "operational";
    let tmdbLatency = 0;

    try {
      const tmdbKey = process.env.TMDB_API_KEY || "07b335f749bb231c41c9022189bfc9c3";
      const res = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${tmdbKey}`, {
        signal: AbortSignal.timeout(4000),
      });
      tmdbLatency = Date.now() - startTmdb;
      if (!res.ok) tmdbStatus = "degraded";
    } catch {
      tmdbLatency = Date.now() - startTmdb;
      tmdbStatus = "error";
    }

    const startVps = Date.now();
    let vpsStatus: "operational" | "degraded" | "error" | "unconfigured" = "unconfigured";
    let vpsLatency = 0;

    const vpsUrl = process.env.SCRAPER_VPS_URL;
    if (vpsUrl) {
      try {
        const res = await fetch(vpsUrl, {
          signal: AbortSignal.timeout(4000),
        });
        vpsLatency = Date.now() - startVps;
        vpsStatus = res.ok || res.status < 500 ? "operational" : "degraded";
      } catch {
        vpsLatency = Date.now() - startVps;
        vpsStatus = "error";
      }
    }

    networkHealth = {
      tmdb: { status: tmdbStatus, latencyMs: tmdbLatency },
      vps: { status: vpsStatus, latencyMs: vpsLatency, url: vpsUrl || null },
      timestamp: now,
    };
    cachedNetworkHealth = networkHealth;
  }

  const mem = process.memoryUsage();
  const memUsedMb = Math.round(mem.rss / (1024 * 1024));

  return {
    tmdb: networkHealth.tmdb,
    vps: networkHealth.vps,
    server: {
      memoryUsedMb: memUsedMb,
      uptimeSec: Math.round(process.uptime()),
      nodeVersion: process.version,
    },
    cachedAt: networkHealth.timestamp,
  };
}

export async function GET(req: NextRequest) {
  const session = await getAdminSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const forceFresh = url.searchParams.get("fresh") === "1";

    const [config, notifications, systemStatus] = await Promise.all([
      getSystemConfig(),
      fetchNotificationsAsync(),
      checkSystemHealth(forceFresh),
    ]);
    const logs = getAdminLogs();

    return NextResponse.json(
      {
        ok: true,
        config,
        notifications,
        logs,
        systemStatus,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (err) {
    console.error("Admin Commands GET error:", err);
    return NextResponse.json({ error: "Failed to load command status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };

  // 1. Send Site Notification
  if (action === "send-notification") {
    const { title, body: notiBody, tag } = body;
    if (!title || !notiBody) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }
    const created = await addNotificationAsync({
      title,
      body: notiBody,
      tag: tag || "Update",
      adminName: session.username,
    });
    return NextResponse.json(
      { ok: true, notification: created, logs: getAdminLogs() },
      { headers: noCacheHeaders },
    );
  }

  // 2. Delete Notification
  if (action === "delete-notification") {
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
    }
    const success = await deleteNotificationAsync(id, session.username);
    return NextResponse.json(
      { ok: success, logs: getAdminLogs() },
      { headers: noCacheHeaders },
    );
  }

  // 3. Toggle Maintenance Mode
  if (action === "toggle-maintenance") {
    const enabled = Boolean(body.enabled);
    const message = typeof body.message === "string" ? body.message : undefined;
    const partial: Record<string, unknown> = { maintenanceMode: enabled };
    if (message !== undefined) partial.maintenanceMessage = message;

    const updated = updateSystemConfig(partial, session.username);
    try {
      revalidatePath("/", "layout");
    } catch {}

    logAdminAction(
      session.username,
      `Toggled Maintenance Mode: ${enabled ? "ENABLED" : "DISABLED"}`,
      message ? `Message: "${message}"` : undefined,
    );
    return NextResponse.json(
      { ok: true, config: updated, logs: getAdminLogs() },
      { headers: noCacheHeaders },
    );
  }

  // 4. Update Maintenance Message
  if (action === "set-maintenance-message") {
    const message = (body.message || "").trim();
    const updated = updateSystemConfig({ maintenanceMessage: message }, session.username);
    logAdminAction(session.username, "Updated Maintenance Message", message);
    return NextResponse.json(
      { ok: true, config: updated, logs: getAdminLogs() },
      { headers: noCacheHeaders },
    );
  }

  // 5. Toggle Signups
  if (action === "toggle-signups") {
    const disabled = Boolean(body.disabled);
    const updated = updateSystemConfig({ signupsDisabled: disabled }, session.username);
    logAdminAction(session.username, `Signups: ${disabled ? "DISABLED" : "ENABLED"}`);
    return NextResponse.json(
      { ok: true, config: updated, logs: getAdminLogs() },
      { headers: noCacheHeaders },
    );
  }

  // 6. Toggle Streaming
  if (action === "toggle-streaming") {
    const disabled = Boolean(body.disabled);
    const updated = updateSystemConfig({ streamingDisabled: disabled }, session.username);
    logAdminAction(session.username, `Streaming Playback: ${disabled ? "DISABLED" : "ENABLED"}`);
    return NextResponse.json(
      { ok: true, config: updated, logs: getAdminLogs() },
      { headers: noCacheHeaders },
    );
  }

  // 7. Clear Cache (PASSWORD PROTECTED ONLY OWNERS KNOW)
  if (action === "clear-cache") {
    const password = (body.password || "").trim();
    if (!password) {
      return NextResponse.json(
        { error: "Owner verification password is required to clear cache" },
        { status: 400 },
      );
    }

    // Re-verify against the configured owner passwords. These are stored as
    // scrypt digests, so they have to go through verifyPassword — comparing the
    // typed password to the digest directly can never match, which silently
    // locked this action for everyone. No literal fallback: with nothing
    // configured the action stays locked.
    const configured: string[] = [];
    for (let i = 1; i <= 8; i += 1) {
      const candidate = (process.env[`ADMIN_PASS_${i}`] || "").trim();
      if (candidate.length > 0) configured.push(candidate);
    }

    const isMatch = configured.some((candidate) => verifyPassword(password, candidate));
    if (!isMatch) {
      logAdminAction(session.username, "FAILED Clear Cache Attempt", "Incorrect owner password provided");
      return NextResponse.json({ error: "Incorrect owner password. Access denied." }, { status: 403 });
    }

    try {
      revalidatePath("/", "layout");
    } catch {}

    logAdminAction(session.username, "Cleared Site Cache", "Revalidated full site catalog & cache");
    return NextResponse.json(
      { ok: true, message: "Site cache cleared and revalidated successfully.", logs: getAdminLogs() },
      { headers: noCacheHeaders },
    );
  }

  // 8. Refresh Catalog
  if (action === "refresh-catalog") {
    try {
      revalidatePath("/", "layout");
      revalidatePath("/movies", "page");
      revalidatePath("/tv", "page");
    } catch {}

    logAdminAction(session.username, "Refreshed Catalog", "Revalidated catalog routes");
    return NextResponse.json(
      { ok: true, message: "Catalog refreshed successfully.", logs: getAdminLogs() },
      { headers: noCacheHeaders },
    );
  }

  // 9. Force User Logout
  if (action === "force-logout") {
    const updated = updateSystemConfig({ authEpoch: Date.now() }, session.username);
    logAdminAction(session.username, "Forced All Users Logout", `New epoch: ${updated.authEpoch}`);
    return NextResponse.json(
      { ok: true, message: "All user sessions invalidated.", logs: getAdminLogs() },
      { headers: noCacheHeaders },
    );
  }

  // 10. Backup Database / Data
  if (action === "backup") {
    const backup = exportFullBackup();
    logAdminAction(session.username, "Generated Full Data Backup");
    return NextResponse.json(
      { ok: true, backup, logs: getAdminLogs() },
      { headers: noCacheHeaders },
    );
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
