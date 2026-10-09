import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./http.js";

// Server-only Supabase client using the SERVICE ROLE key. This bypasses RLS,
// so every function MUST authorize the caller explicitly (see auth.ts). The
// service-role key is read from a non-VITE server env var and never shipped
// to the browser.
let admin: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new HttpError(500, "Server is not configured for cloud mode (missing Supabase env vars)", "not_configured");
  }
  if (!admin) {
    admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return admin;
}

export const THRESHOLD = Number(process.env.ATTENDANCE_THRESHOLD ?? 75);
