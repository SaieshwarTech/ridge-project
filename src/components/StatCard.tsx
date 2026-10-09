import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils.js";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "violet",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "violet" | "blue" | "cyan" | "green" | "red" | "amber";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    violet: "text-accent-violet bg-accent-violet/10",
    blue: "text-accent-blue bg-accent-blue/10",
    cyan: "text-accent-cyan bg-accent-cyan/10",
    green: "text-status-present bg-status-present/10",
    red: "text-status-absent bg-status-absent/10",
    amber: "text-status-late bg-status-late/10",
  };
  return (
    <div className="panel p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function ProgressRing({ value, size = 120 }: { value: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, value)) / 100) * circ;
  const color = value >= 75 ? "#22C55E" : value >= 50 ? "#F59E0B" : "#F43F5E";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-ink">{Math.round(value)}%</span>
        <span className="text-[10px] uppercase tracking-wide text-ink-faint">overall</span>
      </div>
    </div>
  );
}
