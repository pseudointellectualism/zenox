import { NextResponse } from "next/server";
import { ANILIST_CONFIG } from "@/lib/server/integrationsConfig";

export const dynamic = "force-dynamic";

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
    const { access_token } = await request.json();
    if (!access_token) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 });
    }

    const res = await fetch(ANILIST_CONFIG.API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query: VIEWER_QUERY }),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch AniList profile" }, { status: res.status });
    }

    const json = await res.json();
    const viewer = json.data?.Viewer;
    if (!viewer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      username: viewer.name || "AniList User",
      name: viewer.name || "AniList User",
      avatarUrl: viewer.avatar?.large || viewer.avatar?.medium || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error fetching AniList profile", details: String(error) },
      { status: 500 },
    );
  }
}
