import fs from "fs";
import path from "path";
import { getServerSupabase } from "@/lib/server/supabaseServer";

export interface ActiveSession {
  sessionId: string;
  route: string;
  title?: string;
  device: "desktop" | "mobile" | "tablet";
  lastPing: number; // timestamp ms
}

export interface DayAnalytics {
  date: string; // YYYY-MM-DD
  peak: number;
  totalPings: number;
  uniqueSessions: number;
}

export interface HourlyDataPoint {
  hour: number; // 0 - 23
  peak: number;
  label: string;
}

export interface AnalyticsStoreData {
  allTimePeak: number;
  allTimePeakDate: string;
  dailyHistory: Record<string, DayAnalytics>; // key: YYYY-MM-DD
  hourlyToday: Record<number, number>; // hour (0-23) -> peak
  hourlyTodayDate: string; // YYYY-MM-DD that hourlyToday belongs to
  /**
   * Visitor ids seen today, kept so a repeat ping from the same person is
   * counted once. Only today's ids are retained; past days keep just the
   * total in `dailyHistory[date].uniqueSessions`, so the file does not grow
   * without bound.
   */
  uniqueTodayIds: string[];
  uniqueTodayDate: string;
}

// In-memory runtime state that survives hot reloads via globalThis
interface GlobalAnalyticsState {
  activeSessions: Map<string, ActiveSession>;
  store: AnalyticsStoreData;
  // Mirrors store.uniqueTodayIds; rebuilt on load so lookups stay O(1).
  uniqueTodaySet: Set<string>;
  lastPersistedDisk: number;
  lastPersistedSupabase: number;
  lastPrunedSupabase: number;
  supabaseWarningLogged: boolean;
}

const globalAny = globalThis as unknown as { __zenoxAnalyticsState?: GlobalAnalyticsState };

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "analytics.json");

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function loadPersistedStore(): AnalyticsStoreData {
  const today = getTodayString();
  const defaultStore: AnalyticsStoreData = {
    allTimePeak: 0,
    allTimePeakDate: today,
    dailyHistory: {},
    hourlyToday: {},
    hourlyTodayDate: today,
    uniqueTodayIds: [],
    uniqueTodayDate: today,
  };

  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        ...defaultStore,
        ...parsed,
      };
    }
  } catch (err) {
    console.error("[AnalyticsStore] Failed to load from file:", err);
  }

  return defaultStore;
}

function saveStoreToDisk(store: AnalyticsStoreData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // In read-only serverless runtimes (e.g. Vercel), disk write may fail silently
  }
}

function getState(): GlobalAnalyticsState {
  if (!globalAny.__zenoxAnalyticsState) {
    const store = loadPersistedStore();
    globalAny.__zenoxAnalyticsState = {
      activeSessions: new Map<string, ActiveSession>(),
      store,
      uniqueTodaySet: new Set<string>(store.uniqueTodayIds || []),
      lastPersistedDisk: Date.now(),
      lastPersistedSupabase: 0,
      lastPrunedSupabase: 0,
      supabaseWarningLogged: false,
    };
  }
  return globalAny.__zenoxAnalyticsState;
}

const SESSION_TIMEOUT_MS = 60_000; // 60 seconds without ping = left site

/**
 * Upper bound on ids retained for a single day. Past this the count keeps
 * rising but new ids stop being remembered, so a traffic spike cannot grow
 * the stored file indefinitely.
 */
const MAX_UNIQUE_IDS_PER_DAY = 50_000;

/**
 * Counts a visitor id against today, returning the running unique total.
 *
 * Previously `uniqueSessions` was written once, at the first ping of the day,
 * and set to the live concurrent count — so it never reflected how many
 * distinct people visited and never changed again. This tracks ids seen.
 */
function recordUniqueVisitor(visitorId: string, today: string): number {
  const state = getState();

  if (state.store.uniqueTodayDate !== today) {
    state.store.uniqueTodayDate = today;
    state.store.uniqueTodayIds = [];
    state.uniqueTodaySet = new Set<string>();
  }

  if (!state.uniqueTodaySet.has(visitorId)) {
    state.uniqueTodaySet.add(visitorId);
    if (state.store.uniqueTodayIds.length < MAX_UNIQUE_IDS_PER_DAY) {
      state.store.uniqueTodayIds.push(visitorId);
    }
  }

  return state.uniqueTodaySet.size;
}

/** Unique visitors counted for today so far. */
export function getUniqueToday(today: string): number {
  const state = getState();
  if (state.store.uniqueTodayDate !== today) return 0;
  return state.uniqueTodaySet.size;
}

/**
 * Purges local in-memory sessions that haven't sent a ping within SESSION_TIMEOUT_MS
 */
export function cleanupStaleSessions(): number {
  const state = getState();
  const now = Date.now();
  for (const [id, session] of state.activeSessions.entries()) {
    if (now - session.lastPing > SESSION_TIMEOUT_MS) {
      state.activeSessions.delete(id);
    }
  }
  return state.activeSessions.size;
}

/**
 * Merges remote Supabase stats data into local store (always keeping the highest recorded peaks)
 */
function mergeStats(remote: Partial<AnalyticsStoreData>) {
  const state = getState();
  const today = getTodayString();

  if (typeof remote.allTimePeak === "number" && remote.allTimePeak > state.store.allTimePeak) {
    state.store.allTimePeak = remote.allTimePeak;
    state.store.allTimePeakDate = remote.allTimePeakDate || today;
  }

  if (remote.dailyHistory && typeof remote.dailyHistory === "object") {
    for (const [date, remoteDay] of Object.entries(remote.dailyHistory)) {
      const localDay = state.store.dailyHistory[date];
      if (localDay) {
        localDay.peak = Math.max(localDay.peak, remoteDay.peak || 0);
        localDay.totalPings = Math.max(localDay.totalPings, remoteDay.totalPings || 0);
        localDay.uniqueSessions = Math.max(localDay.uniqueSessions, remoteDay.uniqueSessions || 0);
      } else {
        state.store.dailyHistory[date] = remoteDay;
      }
    }
  }

  if (remote.hourlyTodayDate === today && remote.hourlyToday && typeof remote.hourlyToday === "object") {
    if (state.store.hourlyTodayDate !== today) {
      state.store.hourlyTodayDate = today;
      state.store.hourlyToday = {};
    }
    for (const [hourStr, peak] of Object.entries(remote.hourlyToday)) {
      const h = Number(hourStr);
      state.store.hourlyToday[h] = Math.max(state.store.hourlyToday[h] || 0, Number(peak) || 0);
    }
  }
}

/**
 * Persists current stats to Supabase analytics_stats
 */
async function syncStatsToSupabase(force = false) {
  const state = getState();
  const now = Date.now();
  // Throttle to at most once every 10 seconds unless forced (e.g. peak broken)
  if (!force && now - state.lastPersistedSupabase < 10_000) {
    return;
  }

  const supabase = getServerSupabase();
  if (!supabase) return;

  try {
    state.lastPersistedSupabase = now;
    await supabase.from("analytics_stats").upsert(
      {
        id: "global_analytics",
        data: state.store,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch (err: any) {
    if (!state.supabaseWarningLogged && (err?.message?.includes("does not exist") || err?.code === "PGRST205")) {
      state.supabaseWarningLogged = true;
      console.warn("[AnalyticsStore] analytics_stats table not yet initialized in Supabase. Run supabase/schema.sql.");
    }
  }
}

/**
 * Registers an incoming heartbeat ping from a client and synchronizes with Supabase
 */
export async function registerPing(params: {
  sessionId: string;
  route: string;
  title?: string;
  device?: string;
}): Promise<{ liveVisitors: number }> {
  const state = getState();
  const now = Date.now();
  const today = getTodayString();
  const currentHour = new Date().getUTCHours(); // day keys are UTC; the hour must match

  // Normalize device
  const rawDev = (params.device || "").toLowerCase();
  const device: "desktop" | "mobile" | "tablet" = rawDev.includes("mobile")
    ? "mobile"
    : rawDev.includes("tablet") || rawDev.includes("ipad")
      ? "tablet"
      : "desktop";

  // Sanitize sessionId
  const sid = params.sessionId.trim().slice(0, 64);
  if (!sid) {
    return { liveVisitors: state.activeSessions.size };
  }

  // Update local session immediately for sub-millisecond local response
  state.activeSessions.set(sid, {
    sessionId: sid,
    route: params.route || "/",
    title: params.title,
    device,
    lastPing: now,
  });

  // Local stale sessions cleanup
  cleanupStaleSessions();

  let liveCount = state.activeSessions.size;
  let peakChanged = false;

  // Supabase real-time synchronization across servers/devices
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      // 1. Upsert session into Supabase analytics_sessions
      const isoNow = new Date().toISOString();
      await supabase.from("analytics_sessions").upsert(
        {
          session_id: sid,
          route: params.route || "/",
          title: params.title || null,
          device,
          last_ping: isoNow,
        },
        { onConflict: "session_id" }
      );

      // 2. Prune old sessions in Supabase every 60 seconds
      if (now - state.lastPrunedSupabase > 60_000) {
        state.lastPrunedSupabase = now;
        const pruneCutoff = new Date(now - 3 * 60 * 1000).toISOString();
        await supabase.from("analytics_sessions").delete().lt("last_ping", pruneCutoff);
      }

      // 3. Query all active sessions from Supabase (< 60s) to synchronize live count
      const activeThreshold = new Date(now - SESSION_TIMEOUT_MS).toISOString();
      const { data: remoteSessions } = await supabase
        .from("analytics_sessions")
        .select("session_id, route, title, device, last_ping")
        .gte("last_ping", activeThreshold);

      if (remoteSessions && Array.isArray(remoteSessions)) {
        // Sync the in-memory map with Supabase's global view
        const currentActive = new Map<string, ActiveSession>();
        for (const s of remoteSessions) {
          currentActive.set(s.session_id, {
            sessionId: s.session_id,
            route: s.route || "/",
            title: s.title || undefined,
            device: (s.device as "desktop" | "mobile" | "tablet") || "desktop",
            lastPing: new Date(s.last_ping).getTime(),
          });
        }
        state.activeSessions = currentActive;
        liveCount = state.activeSessions.size;
      }
    } catch (err: any) {
      if (!state.supabaseWarningLogged && (err?.message?.includes("does not exist") || err?.code === "PGRST205")) {
        state.supabaseWarningLogged = true;
        console.warn("[AnalyticsStore] analytics_sessions table not in Supabase yet. Run supabase/schema.sql.");
      }
    }
  }

  // Check hourly reset if day rolled over
  if (state.store.hourlyTodayDate !== today) {
    state.store.hourlyTodayDate = today;
    state.store.hourlyToday = {};
  }

  // Update hourly peak
  const currentHourPeak = state.store.hourlyToday[currentHour] ?? 0;
  if (liveCount > currentHourPeak) {
    state.store.hourlyToday[currentHour] = liveCount;
  }

  // Count this visitor against today before touching the daily record, so the
  // stored total is the running number of distinct people rather than the
  // concurrent count that happened to be live at the first ping of the day.
  const uniqueToday = recordUniqueVisitor(sid, today);

  // Update daily history
  if (!state.store.dailyHistory[today]) {
    state.store.dailyHistory[today] = {
      date: today,
      peak: liveCount,
      totalPings: 1,
      uniqueSessions: uniqueToday,
    };
  } else {
    state.store.dailyHistory[today].totalPings += 1;
    state.store.dailyHistory[today].uniqueSessions = uniqueToday;
    if (liveCount > state.store.dailyHistory[today].peak) {
      state.store.dailyHistory[today].peak = liveCount;
    }
  }

  // Update all-time peak
  if (liveCount > state.store.allTimePeak) {
    state.store.allTimePeak = liveCount;
    state.store.allTimePeakDate = today;
    peakChanged = true;
  }

  // Persist to Supabase so stats and peaks never disappear
  if (supabase) {
    syncStatsToSupabase(peakChanged).catch(() => {});
  }

  // Throttle disk persist to at most once every 10 seconds
  if (now - state.lastPersistedDisk > 10_000) {
    state.lastPersistedDisk = now;
    saveStoreToDisk(state.store);
  }

  return { liveVisitors: liveCount };
}

/**
 * Computes peak concurrent visitors across a specific number of past days
 */
function getPeakForPastDays(days: number): number {
  const state = getState();
  const now = Date.now();
  let max = 0;

  for (let i = 0; i < days; i++) {
    // Stepped in whole days of milliseconds rather than with setDate, which
    // walks local calendar days and can repeat or skip one against a UTC key.
    const dateStr = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
    const dayData = state.store.dailyHistory[dateStr];
    if (dayData && dayData.peak > max) {
      max = dayData.peak;
    }
  }

  return max;
}

/**
 * Returns comprehensive analytics summary for the owner dashboard,
 * pulling synchronized data from Supabase so all instances and users match.
 */
export async function getAnalyticsSummary() {
  const state = getState();
  const supabase = getServerSupabase();
  const now = Date.now();
  const today = getTodayString();

  if (supabase) {
    try {
      // 1. Fetch persistent stats from Supabase analytics_stats
      const { data: statsRow } = await supabase
        .from("analytics_stats")
        .select("data")
        .eq("id", "global_analytics")
        .maybeSingle();

      if (statsRow?.data && typeof statsRow.data === "object") {
        mergeStats(statsRow.data as Partial<AnalyticsStoreData>);
      }

      // 2. Prune old sessions in Supabase
      const pruneCutoff = new Date(now - 3 * 60 * 1000).toISOString();
      await supabase.from("analytics_sessions").delete().lt("last_ping", pruneCutoff);

      // 3. Fetch active sessions (< 60s) from Supabase
      const activeThreshold = new Date(now - SESSION_TIMEOUT_MS).toISOString();
      const { data: remoteSessions } = await supabase
        .from("analytics_sessions")
        .select("session_id, route, title, device, last_ping")
        .gte("last_ping", activeThreshold)
        .order("last_ping", { ascending: false });

      if (remoteSessions && Array.isArray(remoteSessions)) {
        const currentActive = new Map<string, ActiveSession>();
        for (const s of remoteSessions) {
          currentActive.set(s.session_id, {
            sessionId: s.session_id,
            route: s.route || "/",
            title: s.title || undefined,
            device: (s.device as "desktop" | "mobile" | "tablet") || "desktop",
            lastPing: new Date(s.last_ping).getTime(),
          });
        }
        state.activeSessions = currentActive;
      }
    } catch (err: any) {
      if (!state.supabaseWarningLogged && (err?.message?.includes("does not exist") || err?.code === "PGRST205")) {
        state.supabaseWarningLogged = true;
        console.warn("[AnalyticsStore] Supabase tables not initialized yet. Using local store.");
      }
    }
  } else {
    cleanupStaleSessions();
  }

  const liveVisitors = state.activeSessions.size;

  // Check hourly reset if day rolled over
  if (state.store.hourlyTodayDate !== today) {
    state.store.hourlyTodayDate = today;
    state.store.hourlyToday = {};
  }

  const currentHour = new Date().getUTCHours(); // day keys are UTC; the hour must match
  if (liveVisitors > (state.store.hourlyToday[currentHour] ?? 0)) {
    state.store.hourlyToday[currentHour] = liveVisitors;
  }

  // Update today's daily record peak
  const uniqueToday = getUniqueToday(today);
  if (!state.store.dailyHistory[today]) {
    state.store.dailyHistory[today] = {
      date: today,
      peak: liveVisitors,
      totalPings: 1,
      uniqueSessions: uniqueToday,
    };
  } else {
    state.store.dailyHistory[today].uniqueSessions = uniqueToday;
    if (liveVisitors > state.store.dailyHistory[today].peak) {
      state.store.dailyHistory[today].peak = liveVisitors;
    }
  }

  // Update all time peak if current live count surpasses it
  let peakChanged = false;
  if (liveVisitors > state.store.allTimePeak) {
    state.store.allTimePeak = liveVisitors;
    state.store.allTimePeakDate = today;
    peakChanged = true;
  }

  // Keep Supabase updated with highest peaks
  if (supabase) {
    syncStatsToSupabase(peakChanged).catch(() => {});
  }

  const peakToday = Math.max(liveVisitors, state.store.dailyHistory[today]?.peak ?? 0);
  const peak7d = Math.max(peakToday, getPeakForPastDays(7));
  const peak30d = Math.max(peakToday, getPeakForPastDays(30));
  const allTimePeak = Math.max(peakToday, state.store.allTimePeak);

  // Group active routes and devices
  const routeCounts: Record<string, { route: string; title?: string; count: number }> = {};
  let desktopCount = 0;
  let mobileCount = 0;
  let tabletCount = 0;

  for (const session of state.activeSessions.values()) {
    const key = session.route || "/";
    if (!routeCounts[key]) {
      routeCounts[key] = { route: key, title: session.title, count: 0 };
    }
    routeCounts[key].count++;

    if (session.device === "mobile") mobileCount++;
    else if (session.device === "tablet") tabletCount++;
    else desktopCount++;
  }

  const topRoutes = Object.values(routeCounts).sort((a, b) => b.count - a.count);

  // 24 Hour timeline for Today (hours 0 to 23)
  const hourlyTimeline: HourlyDataPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const isPastOrCurrent = h <= currentHour;
    const peak = isPastOrCurrent ? (state.store.hourlyToday[h] ?? (h === currentHour ? liveVisitors : 0)) : 0;
    const label = `${h === 0 ? "12" : h > 12 ? String(h - 12) : String(h)}${h >= 12 ? "PM" : "AM"}`;
    hourlyTimeline.push({ hour: h, peak, label });
  }

  // 30 Days daily peak history timeline
  const dailyTimeline: Array<{
    date: string;
    label: string;
    peak: number;
    totalPings: number;
    unique: number;
  }> = [];
  for (let i = 29; i >= 0; i--) {
    const dateStr = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
    const dayData = state.store.dailyHistory[dateStr];
    // Formatted from the UTC key, so the label always names the day whose
    // numbers it sits next to.
    const label = new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    dailyTimeline.push({
      date: dateStr,
      label,
      peak: dateStr === today ? peakToday : (dayData?.peak ?? 0),
      totalPings: dayData?.totalPings ?? 0,
      unique: dateStr === today ? uniqueToday : (dayData?.uniqueSessions ?? 0),
    });
  }

  const totalPingsToday = state.store.dailyHistory[today]?.totalPings ?? 0;

  const uniqueYesterday =
    state.store.dailyHistory[
      new Date(now - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    ]?.uniqueSessions ?? 0;

  return {
    liveVisitors,
    uniqueToday,
    uniqueYesterday,
    peakToday,
    peak7d,
    peak30d,
    allTimePeak,
    allTimePeakDate: state.store.allTimePeakDate || today,
    topRoutes,
    totalPingsToday,
    deviceDistribution: {
      desktop: desktopCount,
      mobile: mobileCount,
      tablet: tabletCount,
      total: liveVisitors,
    },
    hourlyTimeline,
    dailyTimeline,
    updatedAt: new Date().toISOString(),
  };
}
