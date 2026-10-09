import type { Repository } from "./types.js";
import { DemoRepository } from "./demoRepo.js";
import { CloudRepository } from "./cloudRepo.js";

export type AppMode = "demo" | "cloud";

export const APP_MODE: AppMode = (import.meta.env.VITE_APP_MODE as AppMode) === "cloud" ? "cloud" : "demo";

let instance: Repository | null = null;

export function getRepository(): Repository {
  if (!instance) {
    instance = APP_MODE === "cloud" ? new CloudRepository() : new DemoRepository();
  }
  return instance;
}

export type { Repository } from "./types.js";
export * from "./types.js";
