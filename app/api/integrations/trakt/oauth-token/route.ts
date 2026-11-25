import { NextResponse } from "next/server";
import { TRAKT_CONFIG, isProviderConfigured } from "@/lib/server/integrationsConfig";
import { OAUTH_REDIRECT_URI } from "@/lib/siteConfig";

export async function POST(request: Request) {
  try {
    if (!isProviderConfigured(TRAKT_CONFIG)) {
      return NextResponse.json(
        { status: "NOT_CONFIGURED", error: "Trakt sign-in is not configured on this server." },
        { status: 503 },
      );
    }

    const { code, redirect_uri } = await request.json();
    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }

    const payload = {
      code,
      client_id: TRAKT_CONFIG.CLIENT_ID,
      client_secret: TRAKT_CONFIG.CLIENT_SECRET,
      redirect_uri: redirect_uri || OAUTH_REDIRECT_URI,
      grant_type: "authorization_code",
    };

    const res = await fetch(`${TRAKT_CONFIG.API_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Zenox/1.0",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      return NextResponse.json(
        { error: data.error_description || data.error || "Failed to exchange authorization code" },
        { status: 400 },
      );
    }

    // Fetch user profile
    const userHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${data.access_token}`,
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CONFIG.CLIENT_ID,
      "User-Agent": "Zenox/1.0",
      "Cache-Control": "no-cache, no-store",
    };

    const userRes = await fetch(`${TRAKT_CONFIG.API_URL}/users/me?extended=full`, {
      headers: userHeaders,
      cache: "no-store",
    });

    let userData = {
      username: "Trakt User",
      name: "Trakt User",
      avatarUrl: null as string | null,
    };

    if (userRes.ok) {
      const u = await userRes.json();
      let avatarUrl = u.images?.avatar?.full || u.user?.images?.avatar?.full || null;

      if (!avatarUrl || avatarUrl.includes("default-avatar.png")) {
        try {
          const sRes = await fetch(`${TRAKT_CONFIG.API_URL}/users/settings`, {
            headers: userHeaders,
            cache: "no-store",
          });
          if (sRes.ok) {
            const sData = await sRes.json();
            const cand = sData.user?.images?.avatar?.full || sData.images?.avatar?.full;
            if (cand && !cand.includes("default-avatar.png")) {
              avatarUrl = cand;
            }
          }
        } catch {
          // ignore
        }
      }

      userData = {
        username: u.username || "Trakt User",
        name: u.name || u.username,
        avatarUrl,
      };
    }

    return NextResponse.json({
      status: "SUCCESS",
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      user: userData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error exchanging Trakt token", details: String(error) },
      { status: 500 },
    );
  }
}
