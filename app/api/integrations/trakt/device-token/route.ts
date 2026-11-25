import { NextResponse } from "next/server";
import { TRAKT_CONFIG } from "@/lib/server/integrationsConfig";

export async function POST(request: Request) {
  try {
    const { device_code } = await request.json();
    if (!device_code) {
      return NextResponse.json({ error: "Missing device_code" }, { status: 400 });
    }

    const res = await fetch(`${TRAKT_CONFIG.API_URL}/oauth/device/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Zenox/1.0",
      },
      body: JSON.stringify({
        code: device_code,
        client_id: TRAKT_CONFIG.CLIENT_ID,
        client_secret: TRAKT_CONFIG.CLIENT_SECRET,
      }),
    });

    if (res.status === 200) {
      const data = await res.json();
      return NextResponse.json({ status: "SUCCESS", data });
    }

    if (res.status === 400) {
      // Pending authorization from user
      return NextResponse.json({ status: "PENDING" }, { status: 200 });
    }

    if (res.status === 404) {
      return NextResponse.json({ status: "NOT_FOUND", error: "Invalid device code" }, { status: 404 });
    }

    if (res.status === 409) {
      return NextResponse.json({ status: "ALREADY_USED", error: "Code already approved" }, { status: 409 });
    }

    if (res.status === 410) {
      return NextResponse.json({ status: "EXPIRED", error: "Device code expired" }, { status: 410 });
    }

    if (res.status === 418) {
      return NextResponse.json({ status: "DENIED", error: "User denied access" }, { status: 418 });
    }

    if (res.status === 429) {
      return NextResponse.json({ status: "SLOW_DOWN", error: "Rate limit polling" }, { status: 429 });
    }

    const text = await res.text();
    return NextResponse.json({ error: "Unexpected Trakt status", details: text }, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error polling Trakt token", details: String(error) },
      { status: 500 },
    );
  }
}
