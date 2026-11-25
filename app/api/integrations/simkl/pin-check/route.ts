import { NextResponse } from "next/server";
import { SIMKL_CONFIG } from "@/lib/server/integrationsConfig";

export async function POST(request: Request) {
  try {
    const { user_code } = await request.json();
    if (!user_code) {
      return NextResponse.json({ error: "Missing user_code" }, { status: 400 });
    }

    const url = `${SIMKL_CONFIG.API_URL}/oauth/pin/${encodeURIComponent(user_code)}?client_id=${SIMKL_CONFIG.CLIENT_ID}&app-name=${encodeURIComponent(SIMKL_CONFIG.APP_NAME)}&app-version=${encodeURIComponent(SIMKL_CONFIG.APP_VERSION)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": `${SIMKL_CONFIG.APP_NAME}/${SIMKL_CONFIG.APP_VERSION}`,
        "Accept": "application/json",
      },
    });

    const data = await res.json();

    if (data.result === "OK" && data.access_token) {
      return NextResponse.json({ status: "SUCCESS", access_token: data.access_token });
    }

    // Still pending user authorization
    return NextResponse.json({ status: "PENDING", message: data.message || "Authorization pending" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error polling Simkl PIN", details: String(error) },
      { status: 500 },
    );
  }
}
