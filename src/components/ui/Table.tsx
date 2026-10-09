import type { ReactNode } from "react";
import { cn } from "@/lib/utils.js";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full text-sm", className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="text-left text-xs uppercase tracking-wide text-ink-faint">
      <tr className="border-b border-border">{children}</tr>
    </thead>
  );
}

export function TH({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TR({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("transition-colors hover:bg-white/[0.02]", className)}>{children}</tr>;
}

export function TD({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 text-ink", className)}>{children}</td>;
}
