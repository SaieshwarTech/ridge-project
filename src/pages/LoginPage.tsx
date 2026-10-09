import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, FlaskConical, Cloud, ShieldCheck, GraduationCap, UserCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext.js";
import { getRepository } from "@/repo/index.js";
import type { DemoAccount } from "@/repo/types.js";
import { Button } from "@/components/ui/Button.js";
import { Input, Field } from "@/components/ui/Input.js";
import { useToast } from "@/components/ui/Toast.js";

const roleIcon = { admin: ShieldCheck, teacher: GraduationCap, student: UserCircle };

export default function LoginPage() {
  const { mode, loginDemo, loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    getRepository()
      .listDemoAccounts()
      .then(setAccounts)
      .finally(() => setLoaded(true));
  }, []);

  // Show the one-click selector whenever accounts are available (demo mode and
  // browser-direct Supabase mode); fall back to the password form otherwise.
  const useSelector = accounts.length > 0;

  const handleDemo = async (acc: DemoAccount) => {
    setBusy(acc.profileId);
    try {
      await loginDemo(acc.profileId);
      navigate("/dashboard");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Login failed", "error");
    } finally {
      setBusy(null);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("password");
    try {
      await loginWithPassword(email, password);
      navigate("/dashboard");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Login failed", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border shadow-panel md:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between bg-accent-gradient p-8 md:flex">
          <div className="flex items-center gap-2 text-white">
            <CheckCircle2 className="h-7 w-7" />
            <span className="text-2xl font-bold">AttendX</span>
          </div>
          <div className="text-white">
            <h2 className="text-2xl font-bold leading-tight">Serverless Smart Attendance & Analytics</h2>
            <p className="mt-3 text-sm text-white/80">
              Mark attendance, track subject-wise percentages, and surface at-risk students — powered by Vercel
              Functions and Supabase.
            </p>
          </div>
          <p className="text-xs text-white/70">Coastal Institute of Technology · Academic demo</p>
        </div>

        {/* Login panel */}
        <div className="bg-panel p-8">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <CheckCircle2 className="h-6 w-6 text-accent-violet" />
            <span className="text-xl font-bold text-gradient">AttendX</span>
          </div>

          <h1 className="text-xl font-bold text-ink">Sign in</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
            {useSelector ? (
              <>
                <FlaskConical className="h-4 w-4 text-accent-violet" />
                {mode === "demo" ? "Demo mode — pick an account below" : "Pick an account to sign in"}
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4 text-accent-cyan" /> Cloud mode — use your credentials
              </>
            )}
          </p>

          {!loaded ? (
            <div className="mt-6 h-32 animate-pulse rounded-lg bg-white/5" />
          ) : useSelector ? (
            <div className="mt-6 space-y-2.5">
              {accounts.map((acc) => {
                const Icon = roleIcon[acc.role];
                return (
                  <button
                    key={acc.profileId}
                    onClick={() => handleDemo(acc)}
                    disabled={busy !== null}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-bg/40 p-3 text-left transition-all hover:border-accent-violet/50 hover:bg-white/5 disabled:opacity-50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-violet/15 text-accent-violet">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{acc.label}</p>
                      <p className="truncate text-xs text-ink-faint">{acc.email}</p>
                    </div>
                    <span className="text-xs capitalize text-ink-muted">{acc.role}</span>
                  </button>
                );
              })}
              <p className="pt-2 text-center text-xs text-ink-faint">
                {mode === "demo"
                  ? "No password needed in demo mode — data stays in your browser."
                  : "One-click sign-in to the live Supabase database using the shared demo password."}
              </p>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handlePassword}>
              <Field label="Email">
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@coastal.edu" />
              </Field>
              <Field label="Password">
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              <Button type="submit" className="w-full" loading={busy === "password"}>
                Sign in
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
