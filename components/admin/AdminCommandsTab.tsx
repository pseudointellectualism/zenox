"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileText,
  KeyRound,
  Lock,
  LogOut,
  PlaySquare,
  Radio,
  RefreshCw,
  RotateCcw,
  Send,
  Server,
  Shield,
  ShieldAlert,
  Terminal,
  Trash2,
  Unlock,
  UserX,
  Users,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { SITE_DOMAIN } from "@/lib/siteConfig";

interface AdminCommandsTabProps {
  currentUser: { username: string; role: string };
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  tag: string;
  createdAt: string;
  adminName?: string;
}

interface AdminLogItem {
  id: string;
  timestamp: string;
  admin: string;
  action: string;
  details?: string;
}

interface SystemConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  signupsDisabled: boolean;
  streamingDisabled: boolean;
  authEpoch: number;
  updatedAt: string;
  updatedBy?: string;
}

interface SystemHealth {
  tmdb: { status: "operational" | "degraded" | "error"; latencyMs: number };
  vps: { status: "operational" | "degraded" | "error" | "unconfigured"; latencyMs: number; url: string | null };
  server: { memoryUsedMb: number; uptimeSec: number; nodeVersion: string };
}

// 30 random security confirmation words
const CONFIRMATION_WORDS = [
  "nebula", "matrix", "cipher", "apollo", "vortex",
  "zenox", "phoenix", "beacon", "eclipse", "horizon",
  "hazard", "solstice", "phantom", "reactor", "glitch",
  "quantum", "crimson", "sentinel", "titan", "overdrive",
  "velocity", "obsidian", "hyperion", "aurora", "cascade",
  "shadow", "dynamo", "solaris", "ignite", "spectrum"
];

export default function AdminCommandsTab({ currentUser }: AdminCommandsTabProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // System status & data
  const [config, setConfig] = useState<SystemConfig>({
    maintenanceMode: false,
    maintenanceMessage: "",
    signupsDisabled: false,
    streamingDisabled: false,
    authEpoch: 0,
    updatedAt: "",
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [logs, setLogs] = useState<AdminLogItem[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);

  // Notification form state
  const [notiTitle, setNotiTitle] = useState("");
  const [notiBody, setNotiBody] = useState("");
  const [notiTag, setNotiTag] = useState("Update");

  // Maintenance message state
  const [maintMsgInput, setMaintMsgInput] = useState("");
  const [maintMsgDirty, setMaintMsgDirty] = useState(false);

  // Clear cache password modal state
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);
  const [cachePassword, setCachePassword] = useState("");
  const [cacheError, setCacheError] = useState("");

  // Random word security confirmation modal state (for maintenance mode & disable streaming)
  const [wordConfirmModal, setWordConfirmModal] = useState<{
    isOpen: boolean;
    actionType: "enable-maintenance" | "disable-streaming" | null;
    targetWord: string;
    inputWord: string;
    title: string;
    description: string;
  }>({
    isOpen: false,
    actionType: null,
    targetWord: "",
    inputWord: "",
    title: "",
    description: "",
  });

  // Banner message
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (type: "success" | "error", text: string) => {
    setBanner({ type, text });
    setTimeout(() => {
      setBanner((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  };

  // Fetch status & data from API (uses cached server health by default to avoid overloading Scraper VPS)
  const fetchData = useCallback(async (isSilent = false, forceFresh = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const url = forceFresh ? "/api/admin/commands?fresh=1" : "/api/admin/commands";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setConfig(data.config);
          setMaintMsgInput(data.config.maintenanceMessage || "");
          setNotifications(data.notifications || []);
          setLogs(data.logs || []);
          setHealth(data.systemStatus || null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin commands data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // 60-second gentle polling to avoid overloading backend / VPS
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Generic command executor
  const executeCommand = async (action: string, payload: Record<string, unknown> = {}) => {
    setActionLoading(action);
    try {
      const res = await fetch("/api/admin/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.config) {
          setConfig(data.config);
          if (data.config.maintenanceMessage !== undefined) {
            setMaintMsgInput(data.config.maintenanceMessage);
          }
        }
        if (data.logs) {
          setLogs(data.logs);
        }
        if (data.notification) {
          setNotifications((prev) => [data.notification, ...prev.filter((n) => n.id !== data.notification.id)]);
        }
        return { ok: true, data };
      } else {
        showFeedback("error", data.error || "Action failed");
        return { ok: false, error: data.error };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      showFeedback("error", msg);
      return { ok: false, error: msg };
    } finally {
      setActionLoading(null);
    }
  };

  // 1. Send Site Notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notiTitle.trim() || !notiBody.trim()) {
      showFeedback("error", "Title and announcement body are required");
      return;
    }
    const res = await executeCommand("send-notification", {
      title: notiTitle.trim(),
      body: notiBody.trim(),
      tag: notiTag.trim() || "Update",
    });
    if (res.ok) {
      setNotiTitle("");
      setNotiBody("");
      showFeedback("success", "Site notification broadcast successfully!");
    }
  };

  // 2. Delete Notification
  const handleDeleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const res = await executeCommand("delete-notification", { id });
    if (res.ok) {
      showFeedback("success", "Notification removed");
    } else {
      await fetchData(true);
    }
  };

  // 3. Maintenance Mode Toggle Logic with word verification when ENABLING
  const handleToggleMaintenanceClick = () => {
    if (!config.maintenanceMode) {
      // Enabling requires word confirmation
      const randomWord = CONFIRMATION_WORDS[Math.floor(Math.random() * CONFIRMATION_WORDS.length)];
      setWordConfirmModal({
        isOpen: true,
        actionType: "enable-maintenance",
        targetWord: randomWord,
        inputWord: "",
        title: "Confirm Enabling Maintenance Mode",
        description:
          `Enabling maintenance mode will immediately lock the site and display the maintenance screen to all regular visitors across ${SITE_DOMAIN}.`,
      });
    } else {
      // Disabling maintenance mode directly
      executeMaintenanceToggle(false);
    }
  };

  const executeMaintenanceToggle = async (enabled: boolean) => {
    setConfig((prev) => ({ ...prev, maintenanceMode: enabled }));
    const res = await executeCommand("toggle-maintenance", {
      enabled,
      message: maintMsgInput.trim() || config.maintenanceMessage,
    });
    if (res.ok) {
      showFeedback(
        "success",
        enabled ? "Maintenance mode ENABLED. Site is now locked." : "Maintenance mode DISABLED. Site is live!",
      );
    } else {
      await fetchData(true);
    }
  };

  // 4. Save Maintenance Message
  const handleSaveMaintenanceMessage = async () => {
    const res = await executeCommand("set-maintenance-message", {
      message: maintMsgInput.trim(),
    });
    if (res.ok) {
      setMaintMsgDirty(false);
      showFeedback("success", "Maintenance message updated");
    }
  };

  // 5. Toggle Signups
  const handleToggleSignups = async () => {
    const nextState = !config.signupsDisabled;
    const res = await executeCommand("toggle-signups", { disabled: nextState });
    if (res.ok) {
      showFeedback("success", nextState ? "Signups disabled temporarily" : "Signups enabled");
    }
  };

  // 6. Disable Streaming Toggle Logic with word verification when DISABLING
  const handleToggleStreamingClick = () => {
    if (!config.streamingDisabled) {
      // Disabling streaming requires word confirmation
      const randomWord = CONFIRMATION_WORDS[Math.floor(Math.random() * CONFIRMATION_WORDS.length)];
      setWordConfirmModal({
        isOpen: true,
        actionType: "disable-streaming",
        targetWord: randomWord,
        inputWord: "",
        title: "Confirm Disabling Site Streaming",
        description:
          "Disabling streaming will immediately pause and block video playback across the entire site for all users.",
      });
    } else {
      // Re-enabling streaming directly
      executeStreamingToggle(false);
    }
  };

  const executeStreamingToggle = async (disabled: boolean) => {
    setConfig((prev) => ({ ...prev, streamingDisabled: disabled }));
    const res = await executeCommand("toggle-streaming", { disabled });
    if (res.ok) {
      showFeedback(
        "success",
        disabled ? "Streaming playback paused site-wide" : "Streaming playback restored",
      );
    } else {
      await fetchData(true);
    }
  };

  // Handler for completing the word confirmation modal
  const handleConfirmWordAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wordConfirmModal.inputWord.trim().toLowerCase() !== wordConfirmModal.targetWord.toLowerCase()) {
      return;
    }
    const action = wordConfirmModal.actionType;
    setWordConfirmModal((prev) => ({ ...prev, isOpen: false }));

    if (action === "enable-maintenance") {
      await executeMaintenanceToggle(true);
    } else if (action === "disable-streaming") {
      await executeStreamingToggle(true);
    }
  };

  // 7. Clear Cache with Password Verification
  const handleClearCache = async (e: React.FormEvent) => {
    e.preventDefault();
    setCacheError("");
    if (!cachePassword.trim()) {
      setCacheError("Owner password is required");
      return;
    }

    setActionLoading("clear-cache");
    try {
      const res = await fetch("/api/admin/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-cache", password: cachePassword.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setShowClearCacheModal(false);
        setCachePassword("");
        showFeedback("success", "Site cache successfully cleared and revalidated!");
        await fetchData(true);
      } else {
        setCacheError(data.error || "Password verification failed");
      }
    } catch {
      setCacheError("Connection failed");
    } finally {
      setActionLoading(null);
    }
  };

  // 8. Refresh Catalog
  const handleRefreshCatalog = async () => {
    const res = await executeCommand("refresh-catalog");
    if (res.ok) {
      showFeedback("success", "Catalog routes and metadata refreshed!");
    }
  };

  // 9. Backup Database
  const handleBackupDatabase = async () => {
    setActionLoading("backup");
    try {
      const res = await fetch("/api/admin/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup" }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.backup) {
        const jsonStr = JSON.stringify(data.backup, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `zenox-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showFeedback("success", "Database backup downloaded successfully!");
        await fetchData(true);
      } else {
        showFeedback("error", data.error || "Failed to generate backup");
      }
    } catch {
      showFeedback("error", "Failed to download backup");
    } finally {
      setActionLoading(null);
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Alert */}
      {banner && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold backdrop-blur-xl transition-all ${
            banner.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="size-4 shrink-0 text-rose-400" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="rounded-lg p-1 hover:bg-white/10"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-primary/20 border border-primary/30 grid place-items-center text-primary">
              <Terminal className="size-4" />
            </div>
            <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-white tracking-tight">
              Admin & System Commands
            </h2>
          </div>
          <p className="mt-1 text-xs text-white/50">
            Real-time controls, maintenance mode, system health telemetry, and site announcements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchData(false, true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh Telemetry</span>
          </button>

          <button
            type="button"
            onClick={handleBackupDatabase}
            disabled={actionLoading === "backup"}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-on-primary hover:bg-primary/90 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Download className="size-3.5" />
            <span>{actionLoading === "backup" ? "Exporting..." : "Backup Database"}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: System Status & Health Cards (View System Status) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/60">
            <Activity className="size-3.5 text-primary" />
            <span>Live System Status & Health</span>
          </h3>
          <span className="text-[11px] text-white/40">
            Rate-limited telemetry cache (60s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. TMDB API */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/60">TMDB Catalog API</span>
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  health?.tmdb.status === "operational"
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : health?.tmdb.status === "degraded"
                    ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border border-rose-500/30 bg-rose-500/10 text-rose-400"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    health?.tmdb.status === "operational"
                      ? "bg-emerald-400"
                      : health?.tmdb.status === "degraded"
                      ? "bg-amber-400"
                      : "bg-rose-400"
                  }`}
                />
                {health?.tmdb.status || "Unknown"}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-sora)] text-2xl font-bold text-white">
                {health ? `${health.tmdb.latencyMs}ms` : "—"}
              </span>
              <span className="text-[11px] text-white/40">API round-trip</span>
            </div>
          </div>

          {/* 2. Scraper VPS */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/60">Scraper VPS</span>
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  health?.vps.status === "operational"
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : health?.vps.status === "unconfigured"
                    ? "border border-white/10 bg-white/5 text-white/50"
                    : "border border-rose-500/30 bg-rose-500/10 text-rose-400"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    health?.vps.status === "operational" ? "bg-emerald-400" : "bg-white/40"
                  }`}
                />
                {health?.vps.status || "Standby"}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-sora)] text-2xl font-bold text-white">
                {health && health.vps.status !== "unconfigured" ? `${health.vps.latencyMs}ms` : "Standby"}
              </span>
              <span className="text-[11px] text-white/40">
                {health?.vps.status === "unconfigured" ? "Direct fallback" : "VPS latency"}
              </span>
            </div>
          </div>

          {/* 3. Server Memory */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/60">Server Memory (RSS)</span>
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-white/60">
                Node {health?.server.nodeVersion || "v20"}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-sora)] text-2xl font-bold text-white">
                {health ? `${health.server.memoryUsedMb} MB` : "—"}
              </span>
              <span className="text-[11px] text-white/40">Heap + Cache</span>
            </div>
          </div>

          {/* 4. System Uptime */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/60">Process Uptime</span>
              <Clock className="size-3.5 text-white/40" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-sora)] text-2xl font-bold text-white">
                {health ? formatUptime(health.server.uptimeSec) : "—"}
              </span>
              <span className="text-[11px] text-white/40">Continuously running</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Master Controls & Killswitches (Maintenance & Streaming) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Card 1: Maintenance Mode */}
        <div
          className={`relative overflow-hidden rounded-3xl border p-6 backdrop-blur-xl transition-all flex flex-col justify-between ${
            config.maintenanceMode
              ? "border-amber-500/40 bg-amber-500/[0.07]"
              : "border-white/15 bg-black/60"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Wrench className={`size-4 ${config.maintenanceMode ? "text-amber-400" : "text-white/60"}`} />
                  <h4 className="font-bold text-sm text-white">Maintenance Mode</h4>
                </div>
                <p className="text-xs text-white/50">
                  {config.maintenanceMode
                    ? "Site is locked. Regular visitors see the maintenance screen."
                    : "Site is fully active and accessible to all visitors."}
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleMaintenanceClick}
                disabled={actionLoading === "toggle-maintenance"}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  config.maintenanceMode ? "bg-amber-500" : "bg-white/20"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    config.maintenanceMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Preview Maintenance Screen link */}
            <div>
              <a
                href="/maintenance"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all"
              >
                <ExternalLink className="size-3" />
                <span>Preview Maintenance Screen</span>
              </a>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Status:</span>
              <span
                className={`font-bold ${
                  config.maintenanceMode ? "text-amber-300" : "text-emerald-400"
                }`}
              >
                {config.maintenanceMode ? "MAINTENANCE ACTIVE" : "ONLINE & ACCESSIBLE"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Disable Streaming */}
        <div
          className={`relative overflow-hidden rounded-3xl border p-6 backdrop-blur-xl transition-all flex flex-col justify-between ${
            config.streamingDisabled
              ? "border-rose-500/40 bg-rose-500/[0.07]"
              : "border-white/15 bg-black/60"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <PlaySquare className={`size-4 ${config.streamingDisabled ? "text-rose-400" : "text-white/60"}`} />
                <h4 className="font-bold text-sm text-white">Disable Streaming</h4>
              </div>
              <p className="text-xs text-white/50">
                {config.streamingDisabled
                  ? "Playback is paused site-wide for all users."
                  : "Video playback engine is operational."}
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={handleToggleStreamingClick}
              disabled={actionLoading === "toggle-streaming"}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                config.streamingDisabled ? "bg-rose-500" : "bg-white/20"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  config.streamingDisabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Status:</span>
              <span
                className={`font-bold ${
                  config.streamingDisabled ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {config.streamingDisabled ? "STREAMING PAUSED" : "PLAYBACK ENABLED"}
              </span>
            </div>
          </div>
        </div>

        {/* 
          Disable Signups is commented out for now.
        */}
      </div>

      {/* SECTION 3: Maintenance Message Editor */}
      <div className="rounded-3xl border border-white/15 bg-black/60 p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="size-4 text-amber-400" />
          <h4 className="font-bold text-sm text-white">Maintenance Screen Message</h4>
        </div>
        <p className="text-xs text-white/50 mb-4">
          Customize the message users see when visiting the site while maintenance mode is enabled
        </p>

        <div className="space-y-3">
          <textarea
            value={maintMsgInput}
            onChange={(e) => {
              setMaintMsgInput(e.target.value);
              setMaintMsgDirty(true);
            }}
            placeholder="Zenox is currently undergoing scheduled system updates and maintenance. We will be back online shortly!"
            rows={2}
            className="w-full rounded-2xl border border-white/15 bg-white/[0.04] p-3 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveMaintenanceMessage}
              disabled={actionLoading === "set-maintenance-message"}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                maintMsgDirty
                  ? "bg-amber-500 text-black hover:bg-amber-400 shadow-md"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              <Check className="size-3.5" />
              <span>{actionLoading === "set-maintenance-message" ? "Saving..." : "Update Maintenance Message"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4: Operations (Clear Cache with Password, Refresh Catalog) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Clear Cache (WITH PASSWORD VERIFICATION ONLY OWNERS KNOW) */}
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/[0.03] p-6 backdrop-blur-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-rose-400" />
              <h4 className="font-bold text-sm text-white">Clear Site Cache</h4>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Flush and revalidate Next.js server cache across the entire catalog.
              <span className="block mt-1 font-semibold text-rose-300/80">
                Requires owner password verification.
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setCachePassword("");
              setCacheError("");
              setShowClearCacheModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
          >
            <Lock className="size-3.5" />
            <span>Clear Site Cache</span>
          </button>
        </div>

        {/* Refresh Catalog */}
        <div className="rounded-3xl border border-white/15 bg-black/60 p-6 backdrop-blur-xl flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RotateCcw className="size-4 text-primary" />
              <h4 className="font-bold text-sm text-white">Refresh Catalog</h4>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Manually refresh movies, series, trending rails, and TMDB metadata cache routes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshCatalog}
            disabled={actionLoading === "refresh-catalog"}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <RotateCcw className={`size-3.5 ${actionLoading === "refresh-catalog" ? "animate-spin" : ""}`} />
            <span>{actionLoading === "refresh-catalog" ? "Refreshing..." : "Refresh Catalog"}</span>
          </button>
        </div>

        {/* 
          Force User Logout is commented out for now since accounts and backend are not ready yet.
        */}
      </div>

      {/* SECTION 5: Send Site Notification (Title, Body, Tag - Neutral monochrome tag) */}
      <div className="rounded-3xl border border-white/15 bg-black/60 p-6 sm:p-8 backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BellRing className="size-4 text-primary" />
              <h3 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">
                Send Site Notification
              </h3>
            </div>
            <p className="text-xs text-white/50">
              Broadcast announcements, maintenance notices, or updates to all users without a database
            </p>
          </div>
          <span className="text-[11px] text-white/40">
            Rendered with neutral monochrome tag on the live site
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Notification Form */}
          <form onSubmit={handleSendNotification} className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Notification Title
              </label>
              <input
                type="text"
                value={notiTitle}
                onChange={(e) => setNotiTitle(e.target.value)}
                placeholder="e.g. Zenox v2.4 Update or Server Maintenance"
                required
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Tag Label
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={notiTag}
                  onChange={(e) => setNotiTag(e.target.value)}
                  className="rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-primary focus:outline-none"
                >
                  <option value="Update">Update</option>
                  <option value="Notice">Notice</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Announcement">Announcement</option>
                  <option value="Changelog">Changelog</option>
                </select>
                <input
                  type="text"
                  value={notiTag}
                  onChange={(e) => setNotiTag(e.target.value)}
                  placeholder="Or custom tag..."
                  className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Announcement Message Body
              </label>
              <textarea
                value={notiBody}
                onChange={(e) => setNotiBody(e.target.value)}
                placeholder="Details of the update, improvements, or scheduled downtime..."
                rows={3}
                required
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] p-3.5 text-xs text-white placeholder-white/30 focus:border-primary focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading === "send-notification"}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary hover:bg-primary/90 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <Send className="size-3.5" />
              <span>{actionLoading === "send-notification" ? "Broadcasting..." : "Broadcast Notification"}</span>
            </button>
          </form>

          {/* Live Preview (exact live-site style - monochrome tag) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white/50 mb-3">
                <Eye className="size-3.5 text-primary" />
                <span>Live Preview (as seen by users on the live site)</span>
              </div>

              {/* Notification card preview with uncolored neutral tag */}
              <div className="rounded-2xl border border-white/15 bg-black/60 p-4 shadow-lg backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-xs text-white">
                    {notiTitle.trim() || "Notification Title Preview"}
                  </span>
                  {/* Tag: strictly neutral/uncolored as requested! */}
                  <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/75">
                    {notiTag.trim() || "Update"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/60">
                  {notiBody.trim() ||
                    "This is how the notification announcement will appear inside the notification panel on the live site."}
                </p>
                <div className="mt-3 text-[10px] text-white/40">
                  Just now
                </div>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-white/40 italic">
              Note: Notification tags on the live site are displayed without colors (neutral monochrome).
            </p>
          </div>
        </div>

        {/* Active Notifications List with Delete Button */}
        <div className="pt-6 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/60">
              Active Broadcast Notifications ({notifications.length})
            </h4>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-white/40">
              No active broadcast notifications currently posted.
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white">{item.title}</span>
                      <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">{item.body}</p>
                    <div className="text-[10px] text-white/40 pt-1">
                      Posted on {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteNotification(item.id)}
                    title="Delete notification"
                    className="grid size-7 shrink-0 place-items-center rounded-lg border border-white/10 text-white/40 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 6: Admin Audit Logs (Clean, with genuine admin actions) */}
      <div className="rounded-3xl border border-white/15 bg-black/60 p-6 sm:p-8 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <h3 className="font-[family-name:var(--font-sora)] text-base font-bold text-white">
              View Admin Logs
            </h3>
          </div>
          <span className="text-[11px] text-white/40">
            Audit history of genuine commands executed by owners
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-white/40">
            No admin actions logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-white/40">
                  <th className="pb-3 pl-2">Time</th>
                  <th className="pb-3">Admin</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3 pr-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 pl-2 text-white/40 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 font-semibold text-primary">
                      {log.admin}
                    </td>
                    <td className="py-2.5 text-white font-medium">
                      {log.action}
                    </td>
                    <td className="py-2.5 pr-2 text-white/60">
                      {log.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Clear Cache Password Verification Modal */}
      {showClearCacheModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-rose-500/30 bg-black/95 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-rose-400" />
                <h4 className="font-bold text-sm text-white">Owner Password Required</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowClearCacheModal(false)}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Clearing the cache will purge all cached TMDB data and catalog routes. Only verified owners can authorize this action.
            </p>

            <form onSubmit={handleClearCache} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Owner Password
                </label>
                <input
                  type="password"
                  value={cachePassword}
                  onChange={(e) => setCachePassword(e.target.value)}
                  placeholder="Enter your owner password..."
                  autoFocus
                  required
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:border-rose-500 focus:outline-none"
                />
              </div>

              {cacheError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300 font-medium">
                  {cacheError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearCacheModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "clear-cache"}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-600 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Lock className="size-3.5" />
                  <span>{actionLoading === "clear-cache" ? "Verifying..." : "Confirm & Clear Cache"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Random Word Security Confirmation Modal (for Maintenance & Disable Streaming) */}
      {wordConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-amber-500/30 bg-black/95 p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-400" />
                <h4 className="font-bold text-sm text-white">{wordConfirmModal.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setWordConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-white/70">
              {wordConfirmModal.description}
            </p>

            {/* Word Prompt Box */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-center space-y-2">
              <span className="text-[11px] font-semibold text-amber-300/80 uppercase tracking-wider block">
                Type this requested word to confirm:
              </span>
              <div className="inline-block rounded-xl border border-amber-400/40 bg-black/60 px-4 py-1.5 font-mono text-lg font-black tracking-widest text-amber-300 select-all shadow-inner">
                {wordConfirmModal.targetWord}
              </div>
            </div>

            <form onSubmit={handleConfirmWordAction} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={wordConfirmModal.inputWord}
                  onChange={(e) =>
                    setWordConfirmModal((prev) => ({ ...prev, inputWord: e.target.value }))
                  }
                  placeholder={`Type "${wordConfirmModal.targetWord}" here...`}
                  autoFocus
                  required
                  className="w-full rounded-xl border border-white/20 bg-white/[0.05] px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none font-mono text-center tracking-wider"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWordConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    wordConfirmModal.inputWord.trim().toLowerCase() !==
                    wordConfirmModal.targetWord.toLowerCase()
                  }
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Check className="size-3.5" />
                  <span>Confirm Action</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
