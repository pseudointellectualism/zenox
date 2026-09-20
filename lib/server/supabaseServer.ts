import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// Prioritize service role key for full admin read/write permissions on server
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

let cachedServerClient: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) return null;
  if (!cachedServerClient) {
    cachedServerClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedServerClient;
}
