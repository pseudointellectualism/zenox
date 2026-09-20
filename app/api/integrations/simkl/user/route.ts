import { NextResponse } from "next/server";
import { SIMKL_CONFIG } from "@/lib/server/integrationsConfig";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { access_token } = await request.json();
    if (!access_token) {
      return NextResponse.json({ error: "Missing access_token" }, { status: 400 });
    }

    const url = `${SIMKL_CONFIG.API_URL}/users/settings?client_id=${SIMKL_CONFIG.CLIENT_ID}&app-name=${encodeURIComponent(SIMKL_CONFIG.APP_NAME)}&app-version=${encodeURIComponent(SIMKL_CONFIG.APP_VERSION)}`;
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "simkl-api-key": SIMKL_CONFIG.CLIENT_ID,
        "User-Agent": `${SIMKL_CONFIG.APP_NAME}/${SIMKL_CONFIG.APP_VERSION}`,
        "Accept": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: "Failed to fetch Simkl profile", details: errorText }, { status: res.status });
    }

    const data = await res.json();
    const user = data.user || data.account || data || {};

    let rawAvatar = user.avatar || user.user_avatar || data.avatar || null;
    let avatarUrl: string | null = null;

    if (rawAvatar && typeof rawAvatar === "string" && rawAvatar.trim()) {
      let clean = rawAvatar.trim();
      if (clean.startsWith("http://") || clean.startsWith("https://")) {
        avatarUrl = clean;
      } else {
        clean = clean.replace(/^\/+/, "");
        avatarUrl = clean.startsWith("avatars/")
          ? `https://simkl.in/${clean}`
          : `https://simkl.in/avatars/${clean}`;
      }
    }

    return NextResponse.json({
      username: user.name || "Simkl User",
      name: user.name || "Simkl User",
      avatarUrl,
      id: user.id,
      joinedAt: user.joined_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error fetching Simkl profile", details: String(error) },
      { status: 500 },
    );
  }
}

