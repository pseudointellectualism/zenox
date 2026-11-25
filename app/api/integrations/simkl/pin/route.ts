import { NextResponse } from "next/server";
import { SIMKL_CONFIG } from "@/lib/server/integrationsConfig";

export async function POST() {
  try {
    const url = `${SIMKL_CONFIG.API_URL}/oauth/pin?client_id=${SIMKL_CONFIG.CLIENT_ID}&app-name=${encodeURIComponent(SIMKL_CONFIG.APP_NAME)}&app-version=${encodeURIComponent(SIMKL_CONFIG.APP_VERSION)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": `${SIMKL_CONFIG.APP_NAME}/${SIMKL_CONFIG.APP_VERSION}`,
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: "Failed to request Simkl PIN", details: errorText },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error requesting Simkl PIN", details: String(error) },
      { status: 500 },
    );
  }
}
