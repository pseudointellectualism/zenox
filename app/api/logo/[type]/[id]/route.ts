import { NextResponse } from "next/server";
import { getMediaLogo } from "@/lib/tmdb";
import type { MediaType } from "@/lib/types";

export const revalidate = 86400; // cache for 24 hours

export async function GET(
  _request: Request,
  props: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await props.params;
  if (type !== "movie" && type !== "tv") {
    return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
  }

  try {
    const logoPath = await getMediaLogo(type as MediaType, id);
    return NextResponse.json(
      { logoPath },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json({ logoPath: null });
  }
}
