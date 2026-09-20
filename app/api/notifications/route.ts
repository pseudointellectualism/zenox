import { NextResponse } from "next/server";
import { fetchNotificationsAsync } from "@/lib/server/systemConfigStore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notifications = await fetchNotificationsAsync();
    return NextResponse.json(
      { ok: true, notifications },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (err) {
    console.error("[Notifications API] Error:", err);
    return NextResponse.json({ ok: false, notifications: [] }, { status: 500 });
  }
}
