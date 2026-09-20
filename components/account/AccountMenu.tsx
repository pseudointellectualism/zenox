"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, Mail, UserRound } from "lucide-react";

import { getSupabase } from "@/lib/supabase/client";
import { useSession } from "@/lib/supabase/useSession";
import { cn } from "@/lib/utils";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

export default function AccountMenu() {
  const { user, ready, configured } = useSession();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const wrapRef = useRef<HTMLDivElement>(null);

  // Dismiss on outside click or Escape, the way a menu is expected to behave.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase || !email.trim()) return;

    setStatus({ kind: "sending" });
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setStatus(error ? { kind: "error", message: error.message } : { kind: "sent" });
  };

  const signOut = async () => {
    await getSupabase()?.auth.signOut();
    setOpen(false);
  };

  const initial = user?.email?.[0]?.toUpperCase() ?? null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={user ? `Account: ${user.email}` : "Sign in"}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "grid size-9 place-items-center rounded-full transition-colors duration-200",
          user
            ? "bg-primary text-on-primary"
            : "text-white/60 hover:bg-white/10 hover:text-white",
        )}
      >
        {initial ? (
          <span className="text-label-md font-semibold">{initial}</span>
        ) : (
          <UserRound className="size-4.5" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 w-72 rounded-2xl border border-white/15 bg-black/90 p-4 backdrop-blur-[40px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]"
        >
          {!configured ? (
            <div>
              <p className="text-label-md text-white">Accounts are not set up</p>
              <p className="mt-1.5 text-label-sm leading-relaxed text-white/60">
                This feature is coming soon and is not ready yet. Accounts and cross-device sync will be available in an upcoming update.
              </p>
              <p className="mt-2.5 text-label-sm text-white/45">
                Your list and progress are saved in this browser either way.
              </p>
            </div>
          ) : !ready ? (
            <div className="h-16 animate-pulse rounded-lg bg-white/[0.06]" />
          ) : user ? (
            <div>
              <p className="text-label-sm text-white/50">Signed in as</p>
              <p className="mt-0.5 truncate text-label-md text-white">{user.email}</p>
              <p className="mt-2 text-label-sm text-white/50">
                Your list and progress sync to this account.
              </p>
              <button
                type="button"
                onClick={signOut}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-label-md text-white transition-colors hover:bg-white/10"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          ) : status.kind === "sent" ? (
            <div>
              <p className="text-label-md text-white">Check your inbox</p>
              <p className="mt-1.5 text-label-sm leading-relaxed text-white/60">
                We sent a sign-in link to {email}. Open it on this device.
              </p>
            </div>
          ) : (
            <form onSubmit={signIn}>
              <label htmlFor="account-email" className="block text-label-md text-white">
                Sign in
              </label>
              <p className="mt-1 text-label-sm text-white/55">
                We email you a link. No password to remember.
              </p>
              <input
                id="account-email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-3 w-full rounded-full border border-white/15 bg-white/[0.06] px-4 py-2.5 text-label-md text-white placeholder:text-white/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
              {status.kind === "error" && (
                <p role="alert" className="mt-2 text-label-sm text-rose-300">
                  {status.message}
                </p>
              )}
              <button
                type="submit"
                disabled={status.kind === "sending"}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                <Mail className="size-4" />
                {status.kind === "sending" ? "Sending…" : "Email me a link"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
