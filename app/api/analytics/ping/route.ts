import { NextRequest, NextResponse } from "next/server";
import { registerPing } from "@/lib/server/analyticsStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: {
      sessionId?: string;
      route?: string;
      title?: string;
      device?: string;
    } = {};

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await req.json().catch(() => ({}));
    } else {
      const text = await req.text().catch(() => "");
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {}
      }
    }

    const sessionId = body.sessionId || req.headers.get("x-session-id") || "";
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Missing sessionId" }, { status: 400 });
    }

    // Ignore admin routes from skewing visitor analytics
    if (body.route?.startsWith("/admin")) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const { liveVisitors } = await registerPing({
      sessionId,
      route: body.route || "/",
      title: body.title,
      device: body.device,
    });

    return NextResponse.json(
      { ok: true, live: liveVisitors },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (err) {
    console.error("[AnalyticsPing] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
