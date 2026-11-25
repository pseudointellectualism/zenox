import { NextResponse } from "next/server";
import { MAL_CONFIG, isProviderConfigured } from "@/lib/server/integrationsConfig";
import { OAUTH_REDIRECT_URI } from "@/lib/siteConfig";

export async function POST(request: Request) {
  try {
    if (!isProviderConfigured(MAL_CONFIG)) {
      return NextResponse.json(
        { status: "NOT_CONFIGURED", error: "MyAnimeList sign-in is not configured on this server." },
        { status: 503 },
      );
    }

    const { code, code_verifier, redirect_uri, token } = await request.json();

    // If direct token was provided
    if (token) {
      const userRes = await fetch(`${MAL_CONFIG.API_URL}/users/@me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Zenox/1.0",
        },
      });

      if (!userRes.ok) {
        return NextResponse.json(
          { error: "Invalid MyAnimeList access token" },
          { status: 400 },
        );
      }

      const u = await userRes.json();
      return NextResponse.json({
        status: "SUCCESS",
        access_token: token,
        user: {
          username: u.name || "MAL User",
          name: u.name || "MAL User",
          avatarUrl: u.picture || null,
        },
      });
    }

    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }

    const bodyParams = new URLSearchParams();
    bodyParams.append("client_id", MAL_CONFIG.CLIENT_ID);
    bodyParams.append("client_secret", MAL_CONFIG.CLIENT_SECRET);
    bodyParams.append("grant_type", "authorization_code");
    bodyParams.append("code", code);
    bodyParams.append("code_verifier", code_verifier || code);
    bodyParams.append("redirect_uri", redirect_uri || OAUTH_REDIRECT_URI);

    const res = await fetch(`${MAL_CONFIG.AUTH_URL}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Zenox/1.0",
      },
      body: bodyParams.toString(),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      return NextResponse.json(
        { error: data.error_description || data.error || data.message || "Failed to exchange MyAnimeList code" },
        { status: 400 },
      );
    }

    // Fetch user profile
    let userData = {
      username: "MAL User",
      name: "MAL User",
      avatarUrl: null as string | null,
    };

    try {
      const userRes = await fetch(`${MAL_CONFIG.API_URL}/users/@me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          "User-Agent": "Zenox/1.0",
        },
        cache: "no-store",
      });

      if (userRes.ok) {
        const u = await userRes.json();
        userData = {
          username: u.name || "MAL User",
          name: u.name || "MAL User",
          avatarUrl: u.picture || null,
        };
      }
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      status: "SUCCESS",
      access_token: data.access_token,
      refresh_token: data.refresh_token || null,
      expires_in: data.expires_in || 2678400,
      user: userData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error processing MyAnimeList authentication", details: String(error) },
      { status: 500 },
    );
  }
}
