import { NextResponse } from "next/server";
import { TRAKT_CONFIG, isProviderConfigured } from "@/lib/server/integrationsConfig";

export async function POST() {
  try {
    if (!isProviderConfigured(TRAKT_CONFIG)) {
      return NextResponse.json(
        { status: "NOT_CONFIGURED", error: "Trakt sign-in is not configured on this server." },
        { status: 503 },
      );
    }

    const res = await fetch(`${TRAKT_CONFIG.API_URL}/oauth/device/code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Zenox/1.0",
      },
      body: JSON.stringify({
        client_id: TRAKT_CONFIG.CLIENT_ID,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: "Failed to request Trakt device code", details: errorText },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error requesting Trakt device code", details: String(error) },
      { status: 500 },
    );
  }
}
