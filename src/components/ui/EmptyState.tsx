import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-ink-muted">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="font-medium text-ink">{title}</p>
        {message && <p className="mt-1 text-sm text-ink-muted">{message}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <p className="font-medium text-status-absent">Something went wrong</p>
      <p className="max-w-md text-sm text-ink-muted">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-accent-violet hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}
