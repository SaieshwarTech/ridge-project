import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser client. Uses the PUBLISHABLE / anon key only — it is designed to be
// public and is constrained by Row Level Security. The service-role key must
// NEVER appear here or in any VITE_ variable.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "Cloud mode requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Set them in .env or switch VITE_APP_MODE=demo.",
    );
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
