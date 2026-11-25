"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Activity,
  BarChart3,
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  KeyRound,
  Layers,
  LogOut,
  Monitor,
  Plus,
  RefreshCw,
  Rocket,
  RotateCcw,
  Shield,
  Smartphone,
  Tablet,
  Terminal,
  Trash2,
  TrendingUp,
  Tv,
  Users,
} from "lucide-react";
import AdminCommandsTab from "./AdminCommandsTab";
import AdminDeployTab from "./AdminDeployTab";

interface AnalyticsSummary {
  liveVisitors: number;
  uniqueToday: number;
  uniqueYesterday: number;
  peakToday: number;
  peak7d: number;
  peak30d: number;
  allTimePeak: number;
  allTimePeakDate: string;
  topRoutes: Array<{ route: string; title?: string; count: number }>;
  totalPingsToday: number;
  deviceDistribution: {
    desktop: number;
    mobile: number;
    tablet: number;
    total: number;
  };
  hourlyTimeline: Array<{ hour: number; peak: number; label: string }>;
  dailyTimeline: Array<{
    date: string;
    label: string;
    peak: number;
    totalPings: number;
    unique: number;
  }>;
  updatedAt: string;
}

interface AdminDashboardProps {
  currentUser: { username: string; role: string };
  onLogout: () => void;
}

type TabType = "analytics" | "commands" | "deploy" | "account";
type ChartRange = "today" | "7d" | "30d";

export default function AdminDashboard({
  currentUser,
  onLogout,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("analytics");
  const [chartRange, setChartRange] = useState<ChartRange>("today");

  // Analytics data state
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Read after mount rather than during render: the server has no window, and
  // guessing here would produce a hydration mismatch on the first paint.
  const [currentHost, setCurrentHost] = useState("");
  useEffect(() => {
    setCurrentHost(window.location.host);
  }, []);

  // Fetch analytics summary
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setAnalytics(data.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh interval (5 seconds for real-time live visitors)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAnalytics]);

  // Chart data calculation
  const chartPoints = useMemo(() => {
    if (!analytics) return [];
    if (chartRange === "today") {
      return analytics.hourlyTimeline.map((item) => ({
        label: item.label,
        value: item.peak,
      }));
    }
    if (chartRange === "7d") {
      return analytics.dailyTimeline.slice(-7).map((item) => ({
        label: item.label,
        value: item.peak,
      }));
    }
    // 30d
    return analytics.dailyTimeline.map((item) => ({
      label: item.label,
      value: item.peak,
    }));
  }, [analytics, chartRange]);

  const maxChartValue = useMemo(() => {
    const vals = chartPoints.map((p) => p.value);
    return Math.max(5, ...vals);
  }, [chartPoints]);

  return (
    <div className="min-h-screen bg-canvas text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-2xl px-4 sm:px-8 py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
              </span>
              <span className="font-[family-name:var(--font-sora)] font-bold text-lg tracking-tight text-white">
                Zenox
              </span>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
                Owner Analytics
              </span>
            </div>

            {/* Current Domain Badge */}
            <div className="hidden md:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60">
              <Globe className="size-3" />
              <span>{currentHost}</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-white/[0.06] p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "analytics"
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <BarChart3 className="size-3.5" />
              <span>Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("commands")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "commands"
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Terminal className="size-3.5" />
              <span>Commands</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("deploy")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "deploy"
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Rocket className="size-3.5" />
              <span>Deploy</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("account")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "account"
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Shield className="size-3.5" />
              <span>Account</span>
            </button>
          </div>

          {/* Controls: Auto-refresh, Manual Refresh, User info, Logout */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              title={autoRefresh ? "Auto-refresh active (every 5s)" : "Auto-refresh paused"}
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all ${
                autoRefresh
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-white/50 hover:text-white"
              }`}
            >
              <span className={`size-1.5 rounded-full ${autoRefresh ? "bg-emerald-400" : "bg-white/30"}`} />
              <span className="hidden sm:inline">Live 5s</span>
            </button>

            <button
              type="button"
              onClick={fetchAnalytics}
              title="Refresh now"
              className="grid size-8.5 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white transition-all active:scale-95"
            >
              <RefreshCw className={`size-3.5 ${loadingAnalytics ? "animate-spin" : ""}`} />
            </button>

            <div className="hidden lg:flex items-center gap-2 border-l border-white/10 pl-3">
              <div className="size-7 rounded-full bg-primary/20 border border-primary/40 grid place-items-center text-xs font-bold text-primary">
                {currentUser.username[0]?.toUpperCase() || "O"}
              </div>
              <span className="text-xs font-semibold text-white/80">{currentUser.username}</span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Log out"
              className="grid size-8.5 place-items-center rounded-xl border border-white/10 bg-white/5 text-rose-300 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all active:scale-95"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-8 space-y-8">
        {/* ============================================================ */}
        {/* TAB 1: LIVE ANALYTICS                                        */}
        {/* ============================================================ */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            {/* Real-time Hero Visitor Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-black/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
              <div className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full bg-primary/15 blur-3xl" />
              <div className="pointer-events-none absolute -left-12 -bottom-12 size-64 rounded-full bg-emerald-500/15 blur-3xl" />

              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                      Active Live Visitors Right Now
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="font-[family-name:var(--font-sora)] text-6xl sm:text-7xl font-extrabold tracking-tight text-white drop-shadow-sm">
                      {analytics ? analytics.liveVisitors : 0}
                    </span>
                    <span className="text-sm font-semibold text-white/50">
                      users browsing & streaming
                    </span>
                  </div>
                </div>

                <div className="w-full md:w-auto rounded-2xl border border-white/15 bg-black/50 px-5 py-4 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-white/60">
                    <Users className="size-3.5 text-primary" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Unique Visitors Today
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-[family-name:var(--font-sora)] text-4xl font-extrabold tracking-tight text-white">
                      {analytics?.uniqueToday ?? 0}
                    </span>
                    {analytics && analytics.uniqueYesterday > 0 && (
                      <span
                        className={
                          analytics.uniqueToday >= analytics.uniqueYesterday
                            ? "text-xs font-semibold text-emerald-400"
                            : "text-xs font-semibold text-rose-400"
                        }
                      >
                        {analytics.uniqueToday >= analytics.uniqueYesterday ? "+" : ""}
                        {analytics.uniqueToday - analytics.uniqueYesterday} vs yesterday
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">
                    Distinct devices since 00:00 UTC
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Core Peak Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Today's Peak */}
              <div className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.06]">
                <div className="flex items-center justify-between text-white/60">
                  <span className="text-xs font-bold uppercase tracking-wider">Today's Peak</span>
                  <Flame className="size-4 text-amber-400" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="font-[family-name:var(--font-sora)] text-3xl font-bold text-white">
                    {analytics?.peakToday ?? 0}
                  </span>
                  <span className="text-xs text-white/40">concurrent max</span>
                </div>
                <p className="mt-2 text-[11px] text-white/40">
                  Highest live count recorded today
                </p>
              </div>

              {/* Card 2: 7-Day Peak */}
              <div className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.06]">
                <div className="flex items-center justify-between text-white/60">
                  <span className="text-xs font-bold uppercase tracking-wider">7-Day Peak</span>
                  <TrendingUp className="size-4 text-emerald-400" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="font-[family-name:var(--font-sora)] text-3xl font-bold text-white">
                    {analytics?.peak7d ?? 0}
                  </span>
                  <span className="text-xs text-white/40">concurrent max</span>
                </div>
                <p className="mt-2 text-[11px] text-white/40">
                  Highest in the last 7 calendar days
                </p>
              </div>

              {/* Card 3: 30-Day Peak */}
              <div className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.06]">
                <div className="flex items-center justify-between text-white/60">
                  <span className="text-xs font-bold uppercase tracking-wider">30-Day Peak</span>
                  <Calendar className="size-4 text-cyan-400" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="font-[family-name:var(--font-sora)] text-3xl font-bold text-white">
                    {analytics?.peak30d ?? 0}
                  </span>
                  <span className="text-xs text-white/40">concurrent max</span>
                </div>
                <p className="mt-2 text-[11px] text-white/40">
                  Highest in the past 30 days
                </p>
              </div>

              {/* Card 4: All-Time Peak */}
              <div className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.06]">
                <div className="flex items-center justify-between text-white/60">
                  <span className="text-xs font-bold uppercase tracking-wider">All-Time Peak</span>
                  <Activity className="size-4 text-purple-400" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="font-[family-name:var(--font-sora)] text-3xl font-bold text-white">
                    {analytics?.allTimePeak ?? 0}
                  </span>
                  <span className="text-xs text-white/40 font-mono">
                    {analytics?.allTimePeakDate || "N/A"}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-white/40">
                  Record concurrent live traffic
                </p>
              </div>
            </div>

            {/* Peak Visitor Timeline Chart */}
            <div className="rounded-3xl border border-white/15 bg-black/60 p-6 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold text-white">
                    Concurrent Visitor Trends
                  </h2>
                  <p className="text-xs text-white/50">
                    Live peak traffic distribution across time intervals
                  </p>
                </div>

                {/* Range Selector */}
                <div className="flex items-center gap-1 rounded-xl bg-white/[0.06] p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setChartRange("today")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      chartRange === "today"
                        ? "bg-white/20 text-white shadow-xs"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Today (Hourly)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartRange("7d")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      chartRange === "7d"
                        ? "bg-white/20 text-white shadow-xs"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartRange("30d")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      chartRange === "30d"
                        ? "bg-white/20 text-white shadow-xs"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Last 30 Days
                  </button>
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="mt-6 pt-2">
                <div className="flex h-48 w-full items-end gap-1 sm:gap-2">
                  {chartPoints.map((point, idx) => {
                    const heightPct = Math.max(4, Math.round((point.value / maxChartValue) * 100));
                    const isNonZero = point.value > 0;
                    return (
                      <div
                        key={`${point.label}-${idx}`}
                        className="group relative flex flex-1 flex-col items-center h-full justify-end"
                      >
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute -top-8 z-20 hidden rounded-md bg-black/90 border border-white/20 px-2 py-1 text-[10px] font-bold text-white shadow-lg group-hover:flex whitespace-nowrap">
                          {point.label}: {point.value} peak
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            isNonZero
                              ? "bg-gradient-to-t from-primary/60 to-primary group-hover:brightness-125"
                              : "bg-white/[0.04]"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X-axis labels */}
                <div className="mt-3 flex w-full justify-between text-[10px] text-white/40 border-t border-white/5 pt-2">
                  <span>{chartPoints[0]?.label}</span>
                  <span>{chartPoints[Math.floor(chartPoints.length / 2)]?.label}</span>
                  <span>{chartPoints[chartPoints.length - 1]?.label}</span>
                </div>
              </div>
            </div>

            {/* Live Activity & Device Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Active Pages / Titles Currently Watched */}
              <div className="lg:col-span-2 rounded-3xl border border-white/15 bg-black/60 p-6 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv className="size-4 text-primary" />
                    <h3 className="font-bold text-sm text-white">Live Viewing Activity</h3>
                  </div>
                  <span className="text-xs text-white/50">
                    {analytics?.topRoutes.length || 0} active routes
                  </span>
                </div>

                {analytics?.topRoutes && analytics.topRoutes.length > 0 ? (
                  <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                    {analytics.topRoutes.map((routeItem) => (
                      <div
                        key={routeItem.route}
                        className="flex items-center justify-between p-3 text-xs transition-colors hover:bg-white/[0.04]"
                      >
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="font-semibold text-white truncate">
                            {routeItem.title || routeItem.route}
                          </p>
                          <p className="text-[11px] text-white/40 font-mono truncate">
                            {routeItem.route}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-full bg-primary/20 border border-primary/30 px-2.5 py-0.5 font-bold text-xs text-primary">
                            {routeItem.count} watching
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-xs text-white/40">
                    No active visitor traffic right now. Waiting for heartbeats...
                  </div>
                )}
              </div>

              {/* Device Distribution */}
              <div className="rounded-3xl border border-white/15 bg-black/60 p-6 backdrop-blur-xl space-y-5">
                <div className="flex items-center gap-2">
                  <Smartphone className="size-4 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">Device Breakdown</h3>
                </div>

                <div className="space-y-4">
                  {/* Desktop */}
                  <div>
                    <div className="flex justify-between text-xs text-white/80 pb-1">
                      <span className="flex items-center gap-1.5">
                        <Monitor className="size-3.5 text-white/60" />
                        Desktop
                      </span>
                      <span className="font-bold font-mono">
                        {analytics?.deviceDistribution.desktop ?? 0}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        style={{
                          width: `${
                            analytics && analytics.deviceDistribution.total > 0
                              ? Math.round(
                                  (analytics.deviceDistribution.desktop /
                                    analytics.deviceDistribution.total) *
                                    100,
                                )
                              : 0
                          }%`,
                        }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </div>

                  {/* Mobile */}
                  <div>
                    <div className="flex justify-between text-xs text-white/80 pb-1">
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="size-3.5 text-white/60" />
                        Mobile
                      </span>
                      <span className="font-bold font-mono">
                        {analytics?.deviceDistribution.mobile ?? 0}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        style={{
                          width: `${
                            analytics && analytics.deviceDistribution.total > 0
                              ? Math.round(
                                  (analytics.deviceDistribution.mobile /
                                    analytics.deviceDistribution.total) *
                                    100,
                                )
                              : 0
                          }%`,
                        }}
                        className="h-full bg-emerald-400 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Tablet */}
                  <div>
                    <div className="flex justify-between text-xs text-white/80 pb-1">
                      <span className="flex items-center gap-1.5">
                        <Tablet className="size-3.5 text-white/60" />
                        Tablet
                      </span>
                      <span className="font-bold font-mono">
                        {analytics?.deviceDistribution.tablet ?? 0}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        style={{
                          width: `${
                            analytics && analytics.deviceDistribution.total > 0
                              ? Math.round(
                                  (analytics.deviceDistribution.tablet /
                                    analytics.deviceDistribution.total) *
                                    100,
                                )
                              : 0
                          }%`,
                        }}
                        className="h-full bg-cyan-400 rounded-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-white/50">
                  <span className="font-bold text-white/80">Total Heartbeats Today:</span>{" "}
                  {analytics?.totalPingsToday || 0} pings
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: ADMIN COMMANDS                                        */}
        {/* ============================================================ */}
        {activeTab === "commands" && (
          <AdminCommandsTab currentUser={currentUser} />
        )}

        {/* ============================================================ */}
        {/* TAB 4: DEPLOYMENT                                            */}
        {/* ============================================================ */}
        {activeTab === "deploy" && (
          <AdminDeployTab currentUser={currentUser} />
        )}

        {/* ============================================================ */}
        {/* TAB 5: ACCOUNT & SYSTEM                                      */}
        {/* ============================================================ */}
        {activeTab === "account" && (
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-5">
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-white">
                Owner Credentials & Configuration
              </h2>
              <p className="text-xs text-white/50">
                Authorized accounts and environment configuration settings
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Card */}
              <div className="rounded-3xl border border-white/15 bg-black/60 p-6 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-primary" />
                  <h3 className="font-bold text-sm text-white">Active Owner Session</h3>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/50">Signed in as:</span>
                    <span className="font-bold text-white">{currentUser.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Role:</span>
                    <span className="font-bold text-primary uppercase text-[10px]">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Session validity:</span>
                    <span className="text-emerald-400 font-semibold">Active (7 days)</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              {/* Security info Card */}
              <div className="rounded-3xl border border-white/15 bg-black/60 p-6 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-amber-400" />
                  <h3 className="font-bold text-sm text-white">Access Credentials Info</h3>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2 text-xs text-white/60 leading-relaxed">
                  <p>
                    Owner accounts are read from{" "}
                    <code className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">ADMIN_USER_1..8</code>{" "}
                    and the matching{" "}
                    <code className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">ADMIN_PASS_n</code>{" "}
                    in the server environment. You are signed in as:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-white/80 font-mono text-[11px] pt-1">
                    <li>{currentUser.username}</li>
                  </ul>
                  <p className="pt-2 text-[11px] text-white/40">
                    No credentials are compiled into the build, and no signup or registration
                    endpoint exists on the application.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
