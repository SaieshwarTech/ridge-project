/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_MODE?: "demo" | "cloud" | "supabase";
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ATTENDANCE_THRESHOLD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
