import { NextResponse } from "next/server";
import { SIMKL_CONFIG, isProviderConfigured } from "@/lib/server/integrationsConfig";
import { OAUTH_REDIRECT_URI } from "@/lib/siteConfig";

export async function POST(request: Request) {
  try {
    if (!isProviderConfigured(SIMKL_CONFIG)) {
      return NextResponse.json(
        { status: "NOT_CONFIGURED", error: "Simkl sign-in is not configured on this server." },
        { status: 503 },
      );
    }

    const { code, redirect_uri } = await request.json();
    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }

    const payload = {
      code,
      client_id: SIMKL_CONFIG.CLIENT_ID,
      client_secret: SIMKL_CONFIG.CLIENT_SECRET,
      redirect_uri: redirect_uri || OAUTH_REDIRECT_URI,
      grant_type: "authorization_code",
    };

    const res = await fetch(`${SIMKL_CONFIG.API_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `${SIMKL_CONFIG.APP_NAME}/${SIMKL_CONFIG.APP_VERSION}`,
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      return NextResponse.json(
        { error: data.error_description || data.error || "Failed to exchange Simkl authorization code" },
        { status: 400 },
      );
    }

    // Fetch user profile immediately
    const userUrl = `${SIMKL_CONFIG.API_URL}/users/settings?client_id=${SIMKL_CONFIG.CLIENT_ID}&app-name=${encodeURIComponent(SIMKL_CONFIG.APP_NAME)}&app-version=${encodeURIComponent(SIMKL_CONFIG.APP_VERSION)}`;
    const userRes = await fetch(userUrl, {
      headers: {
        "Authorization": `Bearer ${data.access_token}`,
        "simkl-api-key": SIMKL_CONFIG.CLIENT_ID,
        "User-Agent": `${SIMKL_CONFIG.APP_NAME}/${SIMKL_CONFIG.APP_VERSION}`,
        "Accept": "application/json",
        "Cache-Control": "no-cache, no-store",
      },
      cache: "no-store",
    });

    let userData = {
      username: "Simkl User",
      name: "Simkl User",
      avatarUrl: null as string | null,
    };

    if (userRes.ok) {
      const u = await userRes.json();
      const user = u.user || u.account || u || {};
      let rawAvatar = user.avatar || user.user_avatar || u.avatar || null;
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
      userData = {
        username: user.name || "Simkl User",
        name: user.name || "Simkl User",
        avatarUrl,
      };
    }

    return NextResponse.json({
      status: "SUCCESS",
      access_token: data.access_token,
      user: userData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error exchanging Simkl token", details: String(error) },
      { status: 500 },
    );
  }
}
