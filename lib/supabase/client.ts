"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client.
 *
 * Returns null when the project is not configured, so every caller has to
 * handle the unconfigured case explicitly. The app stays fully usable without
 * an account: the library stores keep working against localStorage, exactly as
 * the catalog keeps working without a TMDB key.
 *
 * Only the anon key is used here. It is designed to be public and is useless
 * without row level security, which schema.sql sets up.
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(URL && ANON_KEY);

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  cached ??= createBrowserClient(URL, ANON_KEY);
  return cached;
}
