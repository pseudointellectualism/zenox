import { NextResponse } from "next/server";

import { getStreamProviders } from "@/lib/providers";

/**
 * Server list for the settings overlay. Only identity is exposed, never the
 * URL templates, so configured endpoints stay server-side.
 */
export async function GET() {
  const servers = getStreamProviders().map((p) => ({ id: p.id, label: p.label, kind: p.kind }));
  return NextResponse.json({ servers });
}
