"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  GitBranch,
  Loader2,
  RefreshCw,
  Rocket,
  Terminal,
  XCircle,
} from "lucide-react";

/**
 * Mirrors the payload shape of /api/admin/deploy.
 *
 * Declared here rather than imported from lib/server/deployStore, which is
 * marked `server-only`. A type import would be erased before bundling and work
 * fine, but keeping the client side free of any reference to a server module
 * means the boundary cannot be crossed later by an absent-minded edit that
 * turns the type import into a value one.
 */
type DeployStatus = "idle" | "queued" | "deploying" | "success" | "failed";

interface DeployState {
  status: DeployStatus;
  runId: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  exitCode: number | null;
  commit: string | null;
  previousCommit: string | null;
  requestedBy: string | null;
  requestedAt: number | null;
  busy: boolean;
  hookUnresponsive: boolean;
}

interface CommitInfo {
  hash: string;
  shortHash: string;
  branch: string;
}

interface AdminDeployTabProps {
  currentUser: { username: string; role: string };
}

/** Fast while something is happening, lazy when nothing is. */
const POLL_ACTIVE_MS = 2000;
const POLL_IDLE_MS = 15_000;

/**
 * How long the armed Redeploy button waits for its second press before
 * disarming. Long enough to read the warning and reconsider, short enough that
 * a button left armed does not stay armed for the next person at the keyboard.
 */
const CONFIRM_WINDOW_MS = 10_000;

const STATUS_LABEL: Record<DeployStatus, string> = {
  idle: "No deployment on record",
  queued: "Queued",
  deploying: "Deploying",
  success: "Succeeded",
  failed: "Failed",
};

const STATUS_STYLE: Record<DeployStatus, string> = {
  idle: "border-white/15 bg-white/[0.04] text-white/60",
  queued: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  deploying: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  failed: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

function formatTime(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

function formatDuration(from: number | null, to: number | null): string {
  if (!from || !to || to < from) return "—";
  const seconds = Math.round((to - from) / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default function AdminDeployTab({ currentUser }: AdminDeployTabProps) {
  const [state, setState] = useState<DeployState | null>(null);
  const [current, setCurrent] = useState<CommitInfo | null>(null);
  const [log, setLog] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The deploy restarts the very server answering these polls, so a failed
  // fetch mid-run is expected rather than alarming.
  const [offline, setOffline] = useState(false);

  const logRef = useRef<HTMLPreElement | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/deploy", { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setState(data.state);
      setCurrent(data.current);
      setLog(data.log || "");
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const busy = state?.busy ?? false;

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, busy || offline ? POLL_ACTIVE_MS : POLL_IDLE_MS);
    return () => clearInterval(id);
  }, [fetchState, busy, offline]);

  // Follow the output as it arrives.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  // A misclick here rebuilds production, so the button asks twice.
  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), CONFIRM_WINDOW_MS);
    return () => clearTimeout(id);
  }, [confirming]);

  const triggerDeploy = useCallback(async () => {
    setConfirming(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeploy" }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.state) setState(data.state);
      if (data.current) setCurrent(data.current);
      if (!res.ok) {
        setError(data.error || "Could not start the deployment.");
        return;
      }
      setLog("");
    } catch {
      setError("Could not reach the server to start a deployment.");
    }
  }, []);

  const status: DeployStatus = state?.status ?? "idle";
  const showSpinner = busy || (offline && status === "deploying");

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-5">
        <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-white">
          Deployment
        </h2>
        <p className="text-xs text-white/50">
          Pull the latest commit from the configured repository, rebuild, and restart the
          production service
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Currently running */}
        <div className="rounded-3xl border border-white/15 bg-black/60 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2">
            <GitBranch className="size-4 text-primary" />
            <h3 className="font-bold text-sm text-white">Currently Running</h3>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-white/50">Commit</span>
              <span className="font-mono font-bold text-white">
                {current ? current.shortHash : "unavailable"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50">Branch</span>
              <span className="font-mono text-white/80">{current ? current.branch : "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50">Last deploy</span>
              <span className="text-white/80">{formatTime(state?.finishedAt ?? null)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50">Triggered by</span>
              <span className="text-white/80">{state?.requestedBy || "—"}</span>
            </div>
          </div>

          {!current && (
            <p className="text-[11px] text-white/40 leading-relaxed">
              The commit could not be read. That is expected off the VPS, where the application
              is not running from a git checkout.
            </p>
          )}
        </div>

        {/* Trigger */}
        <div className="rounded-3xl border border-white/15 bg-black/60 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="size-4 text-primary" />
              <h3 className="font-bold text-sm text-white">Redeploy</h3>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[status]}`}
            >
              {showSpinner ? (
                <Loader2 className="size-3 animate-spin" />
              ) : status === "success" ? (
                <Check className="size-3" />
              ) : status === "failed" ? (
                <XCircle className="size-3" />
              ) : (
                <Clock className="size-3" />
              )}
              {STATUS_LABEL[status]}
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2 text-xs text-white/60 leading-relaxed">
            <p>
              Fast-forwards the checkout to the latest commit on the deployment branch, reinstalls
              dependencies, rebuilds, and restarts the service. The build runs before the restart,
              so a failing build leaves the running version untouched.
            </p>
            <p className="text-[11px] text-white/40">
              Signed in as{" "}
              <span className="font-mono text-white/70">{currentUser.username}</span>. The panel is
              the only thing that can start this, and it cannot pass any command through.
            </p>
          </div>

          {state?.hookUnresponsive && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-[11px] text-amber-200">
              <AlertTriangle className="size-3.5 shrink-0 mt-px" />
              <span>
                The request was queued but nothing picked it up. The deploy hook is probably not
                installed or enabled on this host.
              </span>
            </div>
          )}

          {offline && status === "deploying" && (
            <div className="flex items-start gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 p-3 text-[11px] text-sky-200">
              <Loader2 className="size-3.5 shrink-0 mt-px animate-spin" />
              <span>The service is restarting, so the panel briefly cannot reach it. Waiting.</span>
            </div>
          )}

          {status === "failed" && state?.exitCode != null && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[11px] text-rose-200">
              <XCircle className="size-3.5 shrink-0 mt-px" />
              <span>
                The last deployment exited with code {state.exitCode} after{" "}
                {formatDuration(state.startedAt, state.finishedAt)}. The output is below.
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[11px] text-rose-200">
              <AlertTriangle className="size-3.5 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={busy || loading}
              onClick={() => (confirming ? triggerDeploy() : setConfirming(true))}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                confirming
                  ? "border border-amber-400/40 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
                  : "bg-primary text-on-primary hover:bg-primary-hover"
              }`}
            >
              {busy ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{status === "queued" ? "Queued…" : "Deploying…"}</span>
                </>
              ) : confirming ? (
                <>
                  <AlertTriangle className="size-3.5" />
                  <span>Confirm redeploy of production</span>
                </>
              ) : (
                <>
                  <Rocket className="size-3.5" />
                  <span>Redeploy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={fetchState}
              title="Refresh deployment status"
              className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-white/70 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Output */}
      <div className="rounded-3xl border border-white/15 bg-black/60 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-primary" />
            <h3 className="font-bold text-sm text-white">Deployment Output</h3>
          </div>
          {state?.startedAt && (
            <span className="text-[11px] text-white/40">
              Started {formatTime(state.startedAt)} · ran{" "}
              {formatDuration(state.startedAt, state.finishedAt ?? Date.now())}
            </span>
          )}
        </div>

        <pre
          ref={logRef}
          className="max-h-96 overflow-auto rounded-2xl border border-white/10 bg-black/70 p-4 font-mono text-[11px] leading-relaxed text-white/70 whitespace-pre-wrap break-words"
        >
          {log || "No deployment output yet. Press Redeploy to start one."}
        </pre>
      </div>
    </div>
  );
}
