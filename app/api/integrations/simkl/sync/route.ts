import { NextResponse } from "next/server";
import { SIMKL_CONFIG } from "@/lib/server/integrationsConfig";

export async function POST(request: Request) {
  try {
    const { access_token, action, payload, date_from } = await request.json();
    if (!access_token) {
      return NextResponse.json({ error: "Missing access_token" }, { status: 400 });
    }

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${access_token}`,
      "simkl-api-key": SIMKL_CONFIG.CLIENT_ID,
      "User-Agent": `${SIMKL_CONFIG.APP_NAME}/${SIMKL_CONFIG.APP_VERSION}`,
      "Accept": "application/json",
    };

    // Push local watchlist item to Simkl
    if (action === "add_watchlist") {
      const url = `${SIMKL_CONFIG.API_URL}/sync/add-to-list?client_id=${SIMKL_CONFIG.CLIENT_ID}`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return NextResponse.json({ success: res.ok, data });
    }

    // Push history / watched episode or film to Simkl
    if (action === "add_history") {
      const url = `${SIMKL_CONFIG.API_URL}/sync/history?client_id=${SIMKL_CONFIG.CLIENT_ID}`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return NextResponse.json({ success: res.ok, data });
    }

    // Phase 2 Check Activities timestamp
    if (action === "get_activities") {
      const url = `${SIMKL_CONFIG.API_URL}/sync/activities?client_id=${SIMKL_CONFIG.CLIENT_ID}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Pull changes (Phase 1 Sequential or Phase 2 Delta)
    if (action === "get_library") {
      if (date_from) {
        // Phase 2: Delta sync
        const url = `${SIMKL_CONFIG.API_URL}/sync/all-items/?date_from=${encodeURIComponent(date_from)}&client_id=${SIMKL_CONFIG.CLIENT_ID}`;
        const res = await fetch(url, { headers });
        const data = await res.json();
        return NextResponse.json({ type: "delta", data });
      } else {
        // Phase 1: Initial sequential fetch to avoid server spike
        const moviesUrl = `${SIMKL_CONFIG.API_URL}/sync/movies?client_id=${SIMKL_CONFIG.CLIENT_ID}`;
        const moviesRes = await fetch(moviesUrl, { headers });
        const movies = moviesRes.ok ? await moviesRes.json() : [];

        const showsUrl = `${SIMKL_CONFIG.API_URL}/sync/shows?client_id=${SIMKL_CONFIG.CLIENT_ID}`;
        const showsRes = await fetch(showsUrl, { headers });
        const shows = showsRes.ok ? await showsRes.json() : [];

        return NextResponse.json({ type: "initial", movies, shows });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error executing Simkl sync", details: String(error) },
      { status: 500 },
    );
  }
}
