import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Menu,
  LogOut,
  CheckCircle2,
  ChevronLeft,
  FlaskConical,
  Cloud,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext.js";
import { NAV_ITEMS } from "./nav.js";
import { cn, initials } from "@/lib/utils.js";
import { Button } from "@/components/ui/Button.js";
import { ConfirmDialog } from "@/components/ui/Dialog.js";
import { getRepository } from "@/repo/index.js";
import { useToast } from "@/components/ui/Toast.js";

export function DemoBanner() {
  const { mode } = useAuth();
  if (mode !== "demo") return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-accent-violet/15 px-4 py-1.5 text-center text-xs font-medium text-accent-violet">
      <FlaskConical className="h-3.5 w-3.5" />
      DEMO MODE — data lives only in this browser (localStorage). Nothing is saved to a real cloud database.
    </div>
  );
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user } = useAuth();
  const role = user?.profile.role;
  const items = NAV_ITEMS.filter((i) => role && i.roles.includes(role));

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-panel/60 backdrop-blur transition-all md:flex",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-gradient text-white shadow-glow">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        {!collapsed && <span className="text-lg font-bold tracking-tight text-gradient">AttendX</span>}
        <button
          onClick={onToggle}
          className="ml-auto text-ink-faint hover:text-ink"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-accent-violet/15 text-accent-violet" : "text-ink-muted hover:bg-white/5 hover:text-ink",
                collapsed && "justify-center px-0",
              )
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function Topbar({ onMobileNav }: { onMobileNav: () => void }) {
  const { user, logout, mode } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleReset = async () => {
    await getRepository().resetDemoData?.();
    setConfirmReset(false);
    toast("Demo data reset to the original seed", "success");
    window.location.reload();
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-panel/40 px-4 backdrop-blur">
      <button className="text-ink-muted md:hidden" onClick={onMobileNav} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex",
            mode === "demo"
              ? "border-accent-violet/30 bg-accent-violet/10 text-accent-violet"
              : "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan",
          )}
        >
          {mode === "demo" ? <FlaskConical className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
          {mode === "demo" ? "Demo" : "Cloud"}
        </span>

        {mode === "demo" && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        )}

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-gradient text-xs font-bold text-white">
            {user ? initials(user.profile.fullName) : "?"}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium leading-tight text-ink">{user?.profile.fullName}</p>
            <p className="text-[11px] capitalize leading-tight text-ink-faint">{user?.profile.role}</p>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out" title="Log out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        title="Reset demo data?"
        message="This restores the original seeded institution and discards any changes you made in this browser."
        confirmLabel="Reset"
      />
    </header>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const role = user?.profile.role;
  const items = NAV_ITEMS.filter((i) => role && i.roles.includes(role));
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-64 border-r border-border bg-panel p-3 animate-fade-in">
        <div className="mb-3 flex h-10 items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-gradient text-white">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-gradient">AttendX</span>
        </div>
        <nav className="space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  isActive ? "bg-accent-violet/15 text-accent-violet" : "text-ink-muted hover:bg-white/5",
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <DemoBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <MobileNav open={mobileNav} onClose={() => setMobileNav(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar onMobileNav={() => setMobileNav(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
