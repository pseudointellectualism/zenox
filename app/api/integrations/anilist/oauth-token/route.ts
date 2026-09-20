import { NextResponse } from "next/server";
import { ANILIST_CONFIG, isProviderConfigured } from "@/lib/server/integrationsConfig";
import { OAUTH_REDIRECT_URI } from "@/lib/siteConfig";

const VIEWER_QUERY = `
  query {
    Viewer {
      id
      name
      avatar {
        large
        medium
      }
    }
  }
`;

export async function POST(request: Request) {
  try {
    if (!isProviderConfigured(ANILIST_CONFIG)) {
      return NextResponse.json(
        { status: "NOT_CONFIGURED", error: "AniList sign-in is not configured on this server." },
        { status: 503 },
      );
    }

    const { code, redirect_uri, token } = await request.json();

    // If direct token was provided
    if (token) {
      const userRes = await fetch(ANILIST_CONFIG.API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query: VIEWER_QUERY }),
      });

      const userJson = await userRes.json();
      const viewer = userJson.data?.Viewer;
      if (!viewer) {
        return NextResponse.json(
          { error: "Invalid AniList access token" },
          { status: 400 },
        );
      }

      return NextResponse.json({
        status: "SUCCESS",
        access_token: token,
        user: {
          username: viewer.name || "AniList User",
          name: viewer.name || "AniList User",
          avatarUrl: viewer.avatar?.large || viewer.avatar?.medium || null,
        },
      });
    }

    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }

    const payload = {
      grant_type: "authorization_code",
      client_id: ANILIST_CONFIG.CLIENT_ID,
      client_secret: ANILIST_CONFIG.CLIENT_SECRET,
      redirect_uri: redirect_uri || OAUTH_REDIRECT_URI,
      code,
    };

    const res = await fetch(ANILIST_CONFIG.AUTH_URL + "/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      return NextResponse.json(
        { error: data.hint || data.error_description || data.message || "Failed to exchange AniList authorization code" },
        { status: 400 },
      );
    }

    // Fetch user profile via GraphQL
    let userData = {
      username: "AniList User",
      name: "AniList User",
      avatarUrl: null as string | null,
    };

    try {
      const userRes = await fetch(ANILIST_CONFIG.API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query: VIEWER_QUERY }),
        cache: "no-store",
      });

      if (userRes.ok) {
        const userJson = await userRes.json();
        const viewer = userJson.data?.Viewer;
        if (viewer) {
          userData = {
            username: viewer.name || "AniList User",
            name: viewer.name || "AniList User",
            avatarUrl: viewer.avatar?.large || viewer.avatar?.medium || null,
          };
        }
      }
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      status: "SUCCESS",
      access_token: data.access_token,
      expires_in: data.expires_in || 31536000,
      user: userData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error processing AniList authentication", details: String(error) },
      { status: 500 },
    );
  }
}
