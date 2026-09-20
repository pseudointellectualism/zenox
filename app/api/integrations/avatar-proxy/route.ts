import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // searchParams.get is already percent-decoded by URL parser
    let targetUrl = imageUrl.trim();

    // If relative Simkl path
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      const clean = targetUrl.replace(/^\/+/, "");
      targetUrl = clean.startsWith("avatars/")
        ? `https://simkl.in/${clean}`
        : `https://simkl.in/avatars/${clean}`;
    }

    // If it's the obsolete Trakt default-avatar.png that returns 404 on CDN
    if (targetUrl.includes("default-avatar.png")) {
      return NextResponse.json({ error: "Default avatar not found" }, { status: 404 });
    }

    // Pass appropriate Referer for services that block external hotlinking
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    };

    if (targetUrl.includes("trakt.tv")) {
      headers["Referer"] = "https://trakt.tv";
    } else if (targetUrl.includes("simkl.com") || targetUrl.includes("simkl.in")) {
      headers["Referer"] = "https://simkl.com";
    } else if (targetUrl.includes("myanimelist.net")) {
      headers["Referer"] = "https://myanimelist.net";
    } else if (targetUrl.includes("anilist.co")) {
      headers["Referer"] = "https://anilist.co";
    }

    const res = await fetch(targetUrl, {
      headers,
      redirect: "follow",
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch avatar" }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error proxying avatar", details: String(error) },
      { status: 500 },
    );
  }
}
