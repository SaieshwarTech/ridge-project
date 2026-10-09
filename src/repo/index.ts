import type { Repository } from "./types.js";
import { DemoRepository } from "./demoRepo.js";
import { CloudRepository } from "./cloudRepo.js";
import { SupabaseDirectRepository } from "./supabaseDirectRepo.js";

// "demo"     -> localStorage mock (no cloud)
// "cloud"    -> Vercel serverless functions + Supabase
// "supabase" -> browser talks directly to Supabase (BaaS), RLS enforces access
export type AppMode = "demo" | "cloud" | "supabase";

const raw = import.meta.env.VITE_APP_MODE;
export const APP_MODE: AppMode = raw === "cloud" || raw === "supabase" ? raw : "demo";

let instance: Repository | null = null;

export function getRepository(): Repository {
  if (!instance) {
    if (APP_MODE === "cloud") instance = new CloudRepository();
    else if (APP_MODE === "supabase") instance = new SupabaseDirectRepository();
    else instance = new DemoRepository();
  }
  return instance;
}

export type { Repository } from "./types.js";
export * from "./types.js";
