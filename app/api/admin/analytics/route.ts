import { NextResponse } from "next/server";
import { getAdminSessionFromCookies } from "@/lib/server/adminAuth";
import { getAnalyticsSummary } from "@/lib/server/analyticsStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getAnalyticsSummary();
  return NextResponse.json(
    { ok: true, data: summary },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
