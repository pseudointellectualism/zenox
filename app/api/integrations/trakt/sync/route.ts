import { NextResponse } from "next/server";
import { TRAKT_CONFIG } from "@/lib/server/integrationsConfig";

export async function POST(request: Request) {
  try {
    const { access_token, action, payload } = await request.json();
    if (!access_token) {
      return NextResponse.json({ error: "Missing access_token" }, { status: 400 });
    }

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${access_token}`,
      "trakt-api-version": "2",
      "trakt-api-key": TRAKT_CONFIG.CLIENT_ID,
      "User-Agent": "Zenox/1.0",
    };

    // Push local watchlist item to Trakt
    if (action === "add_watchlist") {
      const res = await fetch(`${TRAKT_CONFIG.API_URL}/sync/watchlist`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return NextResponse.json({ success: res.ok, data });
    }

    // Remove local watchlist item from Trakt
    if (action === "remove_watchlist") {
      const res = await fetch(`${TRAKT_CONFIG.API_URL}/sync/watchlist/remove`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return NextResponse.json({ success: res.ok, data });
    }

    // Push playback history / scrobble to Trakt
    if (action === "add_history") {
      const res = await fetch(`${TRAKT_CONFIG.API_URL}/sync/history`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return NextResponse.json({ success: res.ok, data });
    }

    // Pull watchlist from Trakt
    if (action === "get_watchlist") {
      const [moviesRes, showsRes] = await Promise.all([
        fetch(`${TRAKT_CONFIG.API_URL}/sync/watchlist/movies`, { headers }),
        fetch(`${TRAKT_CONFIG.API_URL}/sync/watchlist/shows`, { headers }),
      ]);
      const movies = moviesRes.ok ? await moviesRes.json() : [];
      const shows = showsRes.ok ? await showsRes.json() : [];
      return NextResponse.json({ movies, shows });
    }

    // Pull history from Trakt
    if (action === "get_history") {
      const res = await fetch(`${TRAKT_CONFIG.API_URL}/sync/history?limit=50`, { headers });
      const history = res.ok ? await res.json() : [];
      return NextResponse.json({ history });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error executing Trakt sync", details: String(error) },
      { status: 500 },
    );
  }
}
