import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return new NextResponse("Missing url parameter", { status: 400 });
    }

    const parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new NextResponse("Invalid protocol", { status: 400 });
    }

    const reqHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      Accept: "*/*",
    };

    if (parsed.hostname.includes("rezesubs") || parsed.hostname.includes("meowtv")) {
      reqHeaders["Referer"] = "https://meowtv.ru/";
      reqHeaders["Origin"] = "https://meowtv.ru";
    } else if (parsed.hostname.includes("opensubtitles")) {
      reqHeaders["X-User-Agent"] = "VLSub 0.10.2";
      reqHeaders["User-Agent"] = "VLSub 0.10.2";
    }

    const upstream = await fetch(targetUrl, {
      headers: reqHeaders,
      cache: "force-cache",
    });

    if (!upstream.ok) {
      return new NextResponse(`Upstream returned HTTP ${upstream.status}`, {
        status: upstream.status,
      });
    }

    const text = await upstream.text();
    const contentType = targetUrl.toLowerCase().endsWith(".srt")
      ? "text/plain; charset=utf-8"
      : "text/vtt; charset=utf-8";

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error: any) {
    return new NextResponse(`Proxy error: ${error.message}`, { status: 500 });
  }
}
