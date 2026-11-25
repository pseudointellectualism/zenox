import { NextResponse } from "next/server";
import { MAL_CONFIG } from "@/lib/server/integrationsConfig";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { access_token } = await request.json();
    if (!access_token) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 });
    }

    const res = await fetch(`${MAL_CONFIG.API_URL}/users/@me`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "User-Agent": "Zenox/1.0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch MAL profile" }, { status: res.status });
    }

    const u = await res.json();
    return NextResponse.json({
      username: u.name || "MAL User",
      name: u.name || "MAL User",
      avatarUrl: u.picture || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error fetching MAL profile", details: String(error) },
      { status: 500 },
    );
  }
}
