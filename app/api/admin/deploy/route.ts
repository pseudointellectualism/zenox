import { NextRequest, NextResponse } from "next/server";

import { getAdminSessionFromCookies } from "@/lib/server/adminAuth";
import {
  getDeployState,
  readCurrentCommit,
  readDeployLog,
  requestDeploy,
} from "@/lib/server/deployStore";
import { logAdminAction } from "@/lib/server/systemConfigStore";

export const dynamic = "force-dynamic";

/**
 * Deployment control surface for the owner panel.
 *
 * GET reports the current state; POST queues a run. There is no third verb, and
 * POST accepts no parameters beyond the action name — no branch, no ref, no
 * command. A deployment always means the same thing: fast-forward to the
 * configured remote branch, rebuild, restart. Anything the caller could vary
 * would be something an attacker with a stolen session could vary too.
 *
 * Both verbs require the same signed owner session the rest of the panel uses.
 */

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

function buildPayload() {
  const state = getDeployState();
  return {
    ok: true,
    state,
    log: readDeployLog(),
    current: readCurrentCommit(),
  };
}

export async function GET() {
  const session = await getAdminSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(buildPayload(), { headers: noCacheHeaders });
  } catch (err) {
    console.error("[AdminDeploy] Failed to read deployment state:", err);
    return NextResponse.json({ error: "Failed to read deployment state" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (body.action !== "redeploy") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const outcome = requestDeploy(session.username);
  if (!outcome.ok) {
    // 409 for a run already in flight, so the client can tell "someone beat me
    // to it" apart from "this is broken" and simply resume polling.
    const status = outcome.code === "busy" ? 409 : 500;
    // Spread first, then override `ok`: the payload carries its own success
    // flag and would otherwise flip this response back to looking successful.
    return NextResponse.json(
      { ...buildPayload(), ok: false, error: outcome.message },
      { status, headers: noCacheHeaders },
    );
  }

  const current = readCurrentCommit();
  logAdminAction(
    session.username,
    "Triggered Redeploy",
    current ? `From commit ${current.shortHash} on ${current.branch}` : "Commit unknown",
  );

  return NextResponse.json(buildPayload(), { headers: noCacheHeaders });
}
