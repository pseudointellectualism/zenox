import { NextRequest, NextResponse } from "next/server";
import {
  authenticateOwner,
  createSessionToken,
  ADMIN_SESSION_COOKIE,
  ADMIN_GATE_COOKIE,
  getAdminSessionFromCookies,
} from "@/lib/server/adminAuth";
import { SITE_DOMAIN } from "@/lib/siteConfig";
import { extractClientIp } from "@/lib/server/streamSecurity";
import { checkRateLimit, clearAttempts, recordFailure } from "@/lib/server/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, username, password } = body;

    const isProd = process.env.NODE_ENV === "production";
    const host = req.headers.get("host") || "";
    // Scope the session cookie to the operator's own domain so the admin
    // subdomain and the apex share one session.
    const cookieDomain =
      isProd && SITE_DOMAIN && (host === SITE_DOMAIN || host.endsWith(`.${SITE_DOMAIN}`))
        ? `.${SITE_DOMAIN}`
        : undefined;

    // Handle logout
    if (action === "logout") {
      const res = NextResponse.json({ ok: true, message: "Logged out" });
      const expire = {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax" as const,
        path: "/",
        maxAge: 0,
        domain: cookieDomain,
      };
      res.cookies.set(ADMIN_SESSION_COOKIE, "", expire);
      // Also clear the cookie left by the retired gate-key scheme, so browsers
      // that still carry one are not holding a credential nothing checks.
      res.cookies.set(ADMIN_GATE_COOKIE, "", expire);
      return res;
    }

    // Handle login
    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "Username and password are required" },
        { status: 400 },
      );
    }

    // Throttle by client IP before touching the password, so a brute-force run
    // is capped regardless of how cheap each guess would otherwise be.
    const clientIp = extractClientIp(req.headers);
    const limit = checkRateLimit(clientIp);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many failed attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const user = authenticateOwner(username, password);
    if (!user) {
      const after = recordFailure(clientIp);
      // One message for both a wrong username and a wrong password: saying
      // which was wrong would confirm that an account name exists.
      return NextResponse.json(
        { ok: false, error: "Invalid owner username or password" },
        {
          status: after.allowed ? 401 : 429,
          headers: after.allowed ? undefined : { "Retry-After": String(after.retryAfterSeconds) },
        },
      );
    }

    clearAttempts(clientIp);

    const sessionToken = createSessionToken(user);
    const res = NextResponse.json({
      ok: true,
      user: { username: user.username, role: user.role },
    });

    // Set admin session cookie (7 days)
    res.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      domain: cookieDomain,
    });

    return res;
  } catch (err) {
    console.error("[AdminAuth] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getAdminSessionFromCookies();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user: session });
}
