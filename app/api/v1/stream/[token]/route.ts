import { NextRequest, NextResponse } from "next/server";
import {
  verifyStreamToken,
  validateStreamRequest,
  extractClientIp,
} from "@/lib/server/streamSecurity";
import { SITE_URL } from "@/lib/siteConfig";
import { resolveStellarStream } from "@/lib/sources/stellar";

interface RouteParams {
  params: Promise<{
    token: string;
  }>;
}

/**
 * Handle CORS preflight requests securely.
 * Only allows requests from the operator's own domain (or localhost in dev).
 */
export async function OPTIONS(req: NextRequest) {
  const check = validateStreamRequest(req.headers);
  if (!check.allowed) {
    return NextResponse.json(
      { error: "Forbidden", message: check.reason },
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "null",
        },
      },
    );
  }

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": check.allowedOrigin || SITE_URL,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin, Referer",
    },
  });
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // 1. Strict Referer and Origin validation
    const check = validateStreamRequest(req.headers);
    if (!check.allowed) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: check.reason,
        },
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "null",
            "Vary": "Origin, Referer",
          },
        },
      );
    }

    const allowedOrigin = check.allowedOrigin || SITE_URL;

    // 2. Extract client IP using reliable edge headers
    const clientIp = extractClientIp(req.headers);
    const { token } = await params;

    // 3. Decrypt and verify the opaque AES-256-GCM token
    const verification = verifyStreamToken(token, clientIp);
    if (!verification.valid) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: verification.reason,
        },
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": allowedOrigin,
            "Vary": "Origin, Referer",
          },
        },
      );
    }

    const { payload } = verification;
    const serverIndex = payload.serverIndex ?? 0;

    // 4. Server slot 0 ("Stellar") is resolved directly here, never via the VPS.
    if (serverIndex === 0) {
      const stellarResult = await resolveStellarStream({
        tmdbId: payload.mediaId,
        type: payload.mediaType,
        season: payload.season,
        episode: payload.episode,
      });

      if (stellarResult.found && stellarResult.url) {
        return NextResponse.redirect(stellarResult.url, {
          status: 302,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Vary": "Origin, Referer",
          },
        });
      }

      return NextResponse.json(
        { error: "Not Found", message: "Playback stream not found for this title" },
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": allowedOrigin,
            "Vary": "Origin, Referer",
          },
        },
      );
    }

    // 5. Every other server slot keeps forwarding to the scraper VPS as before.
    const vpsUrl = process.env.SCRAPER_VPS_URL;
    if (vpsUrl) {
      try {
        const upstreamResp = await fetch(`${vpsUrl.replace(/\/$/, "")}/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Zenox-Secret": process.env.SCRAPER_API_SECRET || "",
          },
          body: JSON.stringify({ ...payload, clientIp }),
          cache: "no-store",
        });

        if (!upstreamResp.ok) {
          const errText = await upstreamResp.text().catch(() => "");
          console.error(`[StreamBridge] Upstream returned status ${upstreamResp.status}:`, errText);
          const statusCode = upstreamResp.status === 404 ? 404 : 502;
          return NextResponse.json(
            {
              error: statusCode === 404 ? "Not Found" : "Bad Gateway",
              message: statusCode === 404 ? "Playback stream not found for this title" : "Playback stream is currently unavailable from upstream source",
            },
            {
              status: statusCode,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": allowedOrigin,
                "Vary": "Origin, Referer",
              },
            },
          );
        }

        const manifestText = await upstreamResp.text();
        return new NextResponse(manifestText, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Range, Content-Type, Authorization, X-Requested-With",
            "Vary": "Origin, Referer",
          },
        });
      } catch (upstreamErr) {
        console.error("[StreamBridge] VPS connection failed or timed out:", upstreamErr);
      }
    }

    return NextResponse.json(
      { error: "Not Found", message: "Playback stream not found for this title" },
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowedOrigin,
          "Vary": "Origin, Referer",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error", message: "Internal stream resolution error" },
      { status: 500 },
    );
  }
}

