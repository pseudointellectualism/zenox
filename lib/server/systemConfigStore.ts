import fs from "fs";
import path from "path";
import os from "os";

export interface SystemConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  signupsDisabled: boolean;
  streamingDisabled: boolean;
  authEpoch: number;
}

export interface SiteNotification {
  id: string;
  title: string;
  body: string;
  tag: string;
  created_at: string;
}

export interface AdminLog {
  id: string;
  timestamp: string;
  admin: string;
  action: string;
  details?: string;
}

// Local project bundled data (read-only in Vercel / Lambda)
const DATA_DIR = path.join(process.cwd(), "data");
const BUNDLED_CONFIG_FILE = path.join(DATA_DIR, "system-config.json");
const BUNDLED_NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
const BUNDLED_LOGS_FILE = path.join(DATA_DIR, "admin-logs.json");

// Writable directory (guaranteed writable on Vercel, AWS Lambda, Linux /tmp, and Windows temp)
const TMP_DIR = path.join(os.tmpdir(), "zenox-system-data");
const TMP_CONFIG_FILE = path.join(TMP_DIR, "system-config.json");
const TMP_NOTIFICATIONS_FILE = path.join(TMP_DIR, "notifications.json");
const TMP_LOGS_FILE = path.join(TMP_DIR, "admin-logs.json");

interface GlobalStore {
  config: SystemConfig;
  notifications: SiteNotification[];
  logs: AdminLog[];
  initialized: boolean;
}

const DEFAULT_CONFIG: SystemConfig = {
  maintenanceMode: false,
  maintenanceMessage: "Zenox is currently undergoing scheduled maintenance. We will be back online shortly!",
  signupsDisabled: false,
  streamingDisabled: false,
  authEpoch: Date.now(),
};

const DEFAULT_NOTIFICATIONS: SiteNotification[] = [
  {
    id: "noti-welcome",
    title: "Welcome to Zenox v1.5",
    body: "Streaming servers, subtitle customizer, and faster playback performance are now active.",
    tag: "Update",
    created_at: new Date().toISOString(),
  },
];

const globalAny = globalThis as unknown as { __zenoxSystemStore?: GlobalStore };

function loadStore(): GlobalStore {
  let config = { ...DEFAULT_CONFIG };
  let notifications = [...DEFAULT_NOTIFICATIONS];
  let logs: AdminLog[] = [];

  // 1. First priority: check writable TMP_DIR for runtime updates
  let loadedConfig = false;
  let loadedNotis = false;
  let loadedLogs = false;

  try {
    if (fs.existsSync(TMP_CONFIG_FILE)) {
      const raw = fs.readFileSync(TMP_CONFIG_FILE, "utf-8");
      config = { ...config, ...JSON.parse(raw) };
      loadedConfig = true;
    }
  } catch (err) {
    console.warn("[SystemConfigStore] Error reading config from tmpdir:", err);
  }

  try {
    if (fs.existsSync(TMP_NOTIFICATIONS_FILE)) {
      const raw = fs.readFileSync(TMP_NOTIFICATIONS_FILE, "utf-8");
      notifications = JSON.parse(raw);
      loadedNotis = true;
    }
  } catch (err) {
    console.warn("[SystemConfigStore] Error reading notifications from tmpdir:", err);
  }

  try {
    if (fs.existsSync(TMP_LOGS_FILE)) {
      const raw = fs.readFileSync(TMP_LOGS_FILE, "utf-8");
      logs = JSON.parse(raw);
      loadedLogs = true;
    }
  } catch (err) {
    console.warn("[SystemConfigStore] Error reading logs from tmpdir:", err);
  }

  // 2. Second priority: fallback to bundled files in data/ if not present in tmp
  try {
    if (!loadedConfig && fs.existsSync(BUNDLED_CONFIG_FILE)) {
      const raw = fs.readFileSync(BUNDLED_CONFIG_FILE, "utf-8");
      config = { ...config, ...JSON.parse(raw) };
    }
    if (!loadedNotis && fs.existsSync(BUNDLED_NOTIFICATIONS_FILE)) {
      const raw = fs.readFileSync(BUNDLED_NOTIFICATIONS_FILE, "utf-8");
      notifications = JSON.parse(raw);
    }
    if (!loadedLogs && fs.existsSync(BUNDLED_LOGS_FILE)) {
      const raw = fs.readFileSync(BUNDLED_LOGS_FILE, "utf-8");
      logs = JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[SystemConfigStore] Error reading bundled store from disk:", err);
  }

  return { config, notifications, logs, initialized: true };
}

function persistStore(store: GlobalStore) {
  // Always keep in-memory cache synchronized across all calls in this process
  globalAny.__zenoxSystemStore = store;

  // 1. Write to TMP_DIR (guaranteed writable on Vercel / serverless)
  try {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }
    fs.writeFileSync(TMP_CONFIG_FILE, JSON.stringify(store.config, null, 2), "utf-8");
    fs.writeFileSync(TMP_NOTIFICATIONS_FILE, JSON.stringify(store.notifications, null, 2), "utf-8");
    fs.writeFileSync(TMP_LOGS_FILE, JSON.stringify(store.logs.slice(0, 200), null, 2), "utf-8");
  } catch (err) {
    console.warn("[SystemConfigStore] Error persisting to tmpdir:", err);
  }

  // 2. Also attempt to write to local project data dir (works on local dev & persistent servers)
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(BUNDLED_CONFIG_FILE, JSON.stringify(store.config, null, 2), "utf-8");
    fs.writeFileSync(BUNDLED_NOTIFICATIONS_FILE, JSON.stringify(store.notifications, null, 2), "utf-8");
    fs.writeFileSync(BUNDLED_LOGS_FILE, JSON.stringify(store.logs.slice(0, 200), null, 2), "utf-8");
  } catch {
    // Expected on Vercel read-only filesystem (/var/task)
  }
}

function getStore(): GlobalStore {
  if (globalAny.__zenoxSystemStore && globalAny.__zenoxSystemStore.initialized) {
    return globalAny.__zenoxSystemStore;
  }
  const loaded = loadStore();
  globalAny.__zenoxSystemStore = loaded;
  return loaded;
}

export function getSystemConfig(): SystemConfig {
  return getStore().config;
}

export function updateSystemConfig(partial: Partial<SystemConfig>, adminName: string): SystemConfig {
  const store = getStore();
  store.config = { ...store.config, ...partial };
  persistStore(store);
  return store.config;
}

import { getServerSupabase } from "@/lib/server/supabaseServer";

export async function fetchNotificationsAsync(): Promise<SiteNotification[]> {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        const store = getStore();
        store.notifications = data;
        persistStore(store);
        return data;
      }
    } catch (err) {
      console.warn("[SystemConfigStore] Error querying Supabase notifications:", err);
    }
  }
  return getStore().notifications;
}

export function getNotifications(): SiteNotification[] {
  return getStore().notifications;
}

export async function addNotificationAsync(params: {
  title: string;
  body: string;
  tag: string;
  adminName: string;
}): Promise<SiteNotification> {
  const store = getStore();
  const newNoti: SiteNotification = {
    id: "noti_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6),
    title: params.title.trim(),
    body: params.body.trim(),
    tag: params.tag.trim() || "Update",
    created_at: new Date().toISOString(),
  };

  // 1. Immediately persist in local memory/file store
  store.notifications.unshift(newNoti);
  logAdminAction(params.adminName, "Sent Notification", `Title: "${newNoti.title}" [${newNoti.tag}]`);
  persistStore(store);

  // 2. Persist to Supabase so it survives Vercel container restarts permanently
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("notifications").insert([
        {
          id: newNoti.id,
          title: newNoti.title,
          body: newNoti.body,
          tag: newNoti.tag,
          created_at: newNoti.created_at,
        },
      ]);
      if (error) {
        console.error("[SystemConfigStore] Supabase insert error:", error.message);
      }
    } catch (err) {
      console.error("[SystemConfigStore] Supabase insert exception:", err);
    }
  }

  return newNoti;
}

export function addNotification(params: {
  title: string;
  body: string;
  tag: string;
  adminName: string;
}): SiteNotification {
  const store = getStore();
  const newNoti: SiteNotification = {
    id: "noti_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6),
    title: params.title.trim(),
    body: params.body.trim(),
    tag: params.tag.trim() || "Update",
    created_at: new Date().toISOString(),
  };

  store.notifications.unshift(newNoti);
  logAdminAction(params.adminName, "Sent Notification", `Title: "${newNoti.title}" [${newNoti.tag}]`);
  persistStore(store);

  const supabase = getServerSupabase();
  if (supabase) {
    Promise.resolve(
      supabase
        .from("notifications")
        .insert([
          {
            id: newNoti.id,
            title: newNoti.title,
            body: newNoti.body,
            tag: newNoti.tag,
            created_at: newNoti.created_at,
          },
        ])
    )
      .then((res: any) => {
        if (res?.error) console.error("[SystemConfigStore] Supabase insert error:", res.error.message);
      })
      .catch((err: any) => console.error("[SystemConfigStore] Supabase insert failed:", err));
  }

  return newNoti;
}

export async function deleteNotificationAsync(id: string, adminName: string): Promise<boolean> {
  const store = getStore();
  const initialLen = store.notifications.length;
  store.notifications = store.notifications.filter((n) => n.id !== id);
  const deleted = store.notifications.length < initialLen;

  if (deleted) {
    logAdminAction(adminName, "Deleted Notification", `ID: ${id}`);
    persistStore(store);
  }

  // Delete from Supabase
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) {
        console.error("[SystemConfigStore] Supabase delete error:", error.message);
      }
    } catch (err) {
      console.error("[SystemConfigStore] Supabase delete exception:", err);
    }
  }

  return deleted;
}

export function deleteNotification(id: string, adminName: string): boolean {
  const store = getStore();
  const initialLen = store.notifications.length;
  store.notifications = store.notifications.filter((n) => n.id !== id);
  const deleted = store.notifications.length < initialLen;
  if (deleted) {
    logAdminAction(adminName, "Deleted Notification", `ID: ${id}`);
    persistStore(store);
  }

  const supabase = getServerSupabase();
  if (supabase) {
    Promise.resolve(
      supabase
        .from("notifications")
        .delete()
        .eq("id", id)
    )
      .then((res: any) => {
        if (res?.error) console.error("[SystemConfigStore] Supabase delete error:", res.error.message);
      })
      .catch((err: any) => console.error("[SystemConfigStore] Supabase delete failed:", err));
  }

  return deleted;
}

export function getAdminLogs(): AdminLog[] {
  return getStore().logs;
}

export function logAdminAction(admin: string, action: string, details?: string): AdminLog {
  const store = getStore();
  const newLog: AdminLog = {
    id: "log_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    admin: admin || "owner",
    action,
    details,
  };
  store.logs.unshift(newLog);
  if (store.logs.length > 200) {
    store.logs = store.logs.slice(0, 200);
  }
  persistStore(store);
  return newLog;
}

export function exportFullBackup(): Record<string, unknown> {
  const store = getStore();
  return {
    exportedAt: new Date().toISOString(),
    config: store.config,
    notifications: store.notifications,
    logs: store.logs,
  };
}
