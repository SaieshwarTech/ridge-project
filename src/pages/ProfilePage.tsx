import { FlaskConical, Cloud, ShieldCheck, Mail, Hash } from "lucide-react";
import { useAuth } from "@/context/AuthContext.js";
import { PageHeader } from "@/components/layout/AppLayout.js";
import { Card, CardHeader, CardBody } from "@/components/ui/Card.js";
import { Badge } from "@/components/ui/Badge.js";
import { initials } from "@/lib/utils.js";

export default function ProfilePage() {
  const { user, mode } = useAuth();
  if (!user) return null;
  const p = user.profile;

  return (
    <div>
      <PageHeader title="Profile & Settings" subtitle="Your account details and the current app mode." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" />
          <CardBody className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-gradient text-xl font-bold text-white">
                {initials(p.fullName)}
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">{p.fullName}</p>
                <Badge variant="violet" className="mt-1 capitalize">{p.role}</Badge>
              </div>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-ink-faint" />
                <dd className="text-ink">{p.email}</dd>
              </div>
              <div className="flex items-center gap-3">
                <Hash className="h-4 w-4 text-ink-faint" />
                <dd className="font-mono text-xs text-ink-muted">{p.id}</dd>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-ink-faint" />
                <dd className="text-ink">{p.active ? "Active account" : "Deactivated"}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Application Mode" />
          <CardBody className="space-y-3">
            <div
              className={
                "flex items-start gap-3 rounded-lg border p-4 " +
                (mode === "demo" ? "border-accent-violet/30 bg-accent-violet/10" : "border-accent-cyan/30 bg-accent-cyan/10")
              }
            >
              {mode === "demo" ? (
                <FlaskConical className="mt-0.5 h-5 w-5 text-accent-violet" />
              ) : (
                <Cloud className="mt-0.5 h-5 w-5 text-accent-cyan" />
              )}
              <div>
                <p className="font-medium text-ink">{mode === "demo" ? "Demo Mode" : "Cloud Mode"}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {mode === "demo"
                    ? "Data is stored in this browser's localStorage. Nothing is written to a real cloud database. Use the Reset button in the top bar to restore the original seed."
                    : "Authenticated against Supabase. All privileged operations run on Vercel Serverless Functions with Row Level Security enforced server-side."}
                </p>
              </div>
            </div>
            <p className="text-xs text-ink-faint">
              Switch modes by setting <code className="text-accent-cyan">VITE_APP_MODE</code> to <code>demo</code> or{" "}
              <code>cloud</code> in your environment and rebuilding.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
