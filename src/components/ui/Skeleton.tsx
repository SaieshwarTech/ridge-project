import { cn } from "@/lib/utils.js";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}

export function StatCardSkeleton() {
  return (
    <div className="panel p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-20" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8" />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="p-5">
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
