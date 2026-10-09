import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getRepository, APP_MODE } from "@/repo/index.js";
import type { SessionUser } from "@shared/types.js";

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  mode: "demo" | "cloud";
  loginDemo: (profileId: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const repo = getRepository();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const u = await repo.currentUser();
    setUser(u);
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginDemo = async (profileId: string) => {
    await repo.loginDemo(profileId);
    await refresh();
  };

  const loginWithPassword = async (email: string, password: string) => {
    await repo.loginWithPassword(email, password);
    await refresh();
  };

  const logout = async () => {
    await repo.logout();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, mode: APP_MODE, loginDemo, loginWithPassword, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
