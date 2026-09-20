"use client";

import { useState } from "react";
import { Lock, ShieldAlert, Sparkles, User } from "lucide-react";

interface AdminLoginFormProps {
  onSuccess: (user: { username: string; role: string }) => void;
}

export default function AdminLoginForm({ onSuccess }: AdminLoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Invalid username or password");
        setLoading(false);
        return;
      }

      onSuccess(data.user);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] w-full items-center justify-center p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-black/85 p-8 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl ring-1 ring-white/10">
        {/* Glow ambient accent */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-48 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative flex flex-col items-center text-center">
          <div className="grid size-14 place-items-center rounded-2xl border border-white/20 bg-white/[0.06] shadow-inner">
            <Lock className="size-6 text-primary" strokeWidth={2.5} />
          </div>

          <h1 className="mt-4 font-[family-name:var(--font-sora)] text-2xl font-bold tracking-tight text-white">
            Zenox Owner Portal
          </h1>
          <p className="mt-1 text-xs text-white/50">
            Private live visitor analytics & system gateway
          </p>

          <form onSubmit={handleSubmit} className="mt-7 flex w-full flex-col gap-4 text-left">
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
                <ShieldAlert className="size-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-semibold uppercase tracking-wider text-white/60"
              >
                Owner Username
              </label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                <input
                  id="admin-username"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-primary focus:bg-white/[0.09] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold uppercase tracking-wider text-white/60"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-primary focus:bg-white/[0.09] focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-on-primary shadow-sm transition-all hover:bg-primary/90 hover:shadow-[0_0_24px_rgba(255,255,255,0.2)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="size-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <>
                  <Sparkles className="size-4 fill-current" />
                  <span>Enter Dashboard</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-[11px] text-white/30">
            Authorized owner access only • IP logged and monitored
          </p>
        </div>
      </div>
    </div>
  );
}
