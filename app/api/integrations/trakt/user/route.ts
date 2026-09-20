import { NextResponse } from "next/server";
import { TRAKT_CONFIG } from "@/lib/server/integrationsConfig";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { access_token } = await request.json();
    if (!access_token) {
      return NextResponse.json({ error: "Missing access_token" }, { status: 400 });
    }

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${access_token}`,
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CONFIG.CLIENT_ID,
      "User-Agent": "Zenox/1.0",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
    };

    const res = await fetch(`${TRAKT_CONFIG.API_URL}/users/me?extended=full`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: "Failed to fetch Trakt profile", details: errorText }, { status: res.status });
    }

    const data = await res.json();
    let avatarUrl = data.images?.avatar?.full || data.user?.images?.avatar?.full || null;

    // If avatarUrl is missing or is the obsolete default-avatar.png, check /users/settings
    if (!avatarUrl || avatarUrl.includes("default-avatar.png")) {
      try {
        const settingsRes = await fetch(`${TRAKT_CONFIG.API_URL}/users/settings`, {
          headers,
          cache: "no-store",
        });
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          const candidate =
            settingsData.user?.images?.avatar?.full || settingsData.images?.avatar?.full || null;
          if (candidate && !candidate.includes("default-avatar.png")) {
            avatarUrl = candidate;
          }
        }
      } catch {
        // Fallback to initial avatarUrl
      }
    }

    return NextResponse.json({
      username: data.username,
      name: data.name || data.username,
      avatarUrl,
      vip: Boolean(data.vip || data.vip_ep),
      joinedAt: data.joined_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error fetching Trakt profile", details: String(error) },
      { status: 500 },
    );
  }
}
