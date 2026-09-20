import { headers } from "next/headers";

import { getAdminSessionFromCookies } from "@/lib/server/adminAuth";
import { adminDomain } from "@/lib/siteConfig";
import AdminClientPage from "./AdminClientPage";

export const dynamic = "force-dynamic";

/**
 * Owner panel.
 *
 * Reachable only on the configured admin hostname; the middleware answers 404
 * for this path on every other host. Access is a signed session issued by
 * /api/admin/auth against a scrypt digest — there is no key-in-the-URL path,
 * because a secret in a query string is written to proxy logs, browser
 * history, and any Referer the page later sends.
 */
export default async function AdminPage() {
  const headerList = await headers();
  const host = (headerList.get("host") || "").toLowerCase().split(":")[0];

  // Defence in depth: if this ever renders off the admin host, show nothing.
  if (host !== adminDomain()) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black font-mono text-xs text-white/60 p-4 select-none">
        <pre>{JSON.stringify({ error: "Not Found", status: 404 }, null, 2)}</pre>
      </div>
    );
  }

  const sessionUser = await getAdminSessionFromCookies();

  return <AdminClientPage initialUser={sessionUser} />;
}
