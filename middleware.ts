import { NextRequest, NextResponse } from "next/server";

import { getStreamProviders, providerOrigins } from "@/lib/providers";
import { adminDomain } from "@/lib/siteConfig";

function json404() {
  return NextResponse.json(
    { error: "Not Found", status: 404 },
    {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}

/**
 * Edge security headers & subdomain routing.
 *
 * `frame-src` and `media-src` are derived from the operator's own
 * STREAM_PROVIDERS entries, so an embed can only ever load from an origin that
 * was explicitly registered. With nothing configured the app frames nothing.
 */
export function middleware(request: NextRequest) {
  // Strip any port so a host header like "admin.example.com:443" still matches.
  const hostname = (request.headers.get("host") || "").toLowerCase().split(":")[0];
  const url = request.nextUrl.clone();
  const isAdminHost = hostname === adminDomain();

  // 1. The admin host exposes the panel and nothing else.
  //
  // This layer only decides WHERE the panel may be reached, never WHETHER the
  // caller is authenticated — that is settled in app/admin/page.tsx against a
  // signed session. An earlier version accepted any `?gate=` value of 16
  // characters and treated the mere presence of a cookie as proof, both of
  // which anyone could forge; neither is consulted any more.
  if (isAdminHost) {
    const isInfraPath =
      url.pathname.startsWith("/_next") ||
      url.pathname.startsWith("/api/admin") ||
      url.pathname.startsWith("/api/analytics") ||
      url.pathname.includes(".");

    if (!isInfraPath) {
      // Root sends you to the panel, which renders its own login when signed out.
      //
      // A redirect rather than a rewrite, and built from the forwarded headers
      // rather than request.url or nextUrl: both of those carry the server's
      // internal origin (127.0.0.1:3000 behind the proxy), so a rewrite names a
      // different host, Next treats it as an external proxy, and the request
      // re-enters this middleware with that internal Host. It then fails the
      // admin-domain test and answers 404 for what should have been the login.
      if (url.pathname === "/") {
        const proto = request.headers.get("x-forwarded-proto") || "https";
        const response = NextResponse.redirect(`${proto}://${hostname}/admin`, 307);
        applySecurityHeaders(response);
        return response;
      }

      if (url.pathname === "/admin") {
        const response = NextResponse.next();
        applySecurityHeaders(response);
        return response;
      }

      // The catalog is not served here, so every other path is a 404.
      return json404();
    }
  } else if (url.pathname === "/admin") {
    // 2. The panel does not exist on the public site, for anyone, ever.
    return json404();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", url.pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  applySecurityHeaders(response);
  return response;
}

function applySecurityHeaders(response: NextResponse) {
  const { frame, media } = providerOrigins(getStreamProviders());
  const isDev = process.env.NODE_ENV === "development";

  // Extra media/connect origins the operator runs themselves, comma separated.
  const extraOrigins: string[] = (process.env.STREAM_EXTRA_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  if (process.env.SCRAPER_VPS_URL) {
    try {
      const parsedOrigin = new URL(process.env.SCRAPER_VPS_URL).origin;
      if (!extraOrigins.includes(parsedOrigin)) {
        extraOrigins.push(parsedOrigin);
      }
    } catch {}
  }

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://image.tmdb.org https://media.tenor.com https://*.tenor.com",
    `media-src 'self' blob: data: https: http: ${extraOrigins.join(" ")} ${media.join(" ")}`.trim(),
    "worker-src 'self' blob:",
    `connect-src 'self' blob: data: https: http: ${extraOrigins.join(" ")} ${media.join(" ")}${isDev ? " ws: wss:" : ""}`.trim(),
    `frame-src 'self' https: http: ${frame.join(" ")}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
