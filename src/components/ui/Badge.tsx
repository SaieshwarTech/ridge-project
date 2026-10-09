import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils.js";
import type { AttendanceStatus } from "@shared/types.js";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-white/5 text-ink-muted border border-border",
        present: "bg-status-present/15 text-status-present border border-status-present/30",
        absent: "bg-status-absent/15 text-status-absent border border-status-absent/30",
        late: "bg-status-late/15 text-status-late border border-status-late/30",
        excused: "bg-accent-blue/15 text-accent-blue border border-accent-blue/30",
        cancelled: "bg-status-cancelled/15 text-ink-faint border border-border",
        violet: "bg-accent-violet/15 text-accent-violet border border-accent-violet/30",
        success: "bg-status-present/15 text-status-present border border-status-present/30",
        warning: "bg-status-late/15 text-status-late border border-status-late/30",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function StatusBadge({ status }: { status: AttendanceStatus | string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge variant={status as BadgeProps["variant"]}>{label}</Badge>;
}
