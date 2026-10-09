import { useState } from "react";
import { getRepository } from "@/repo/index.js";
import { useAsync } from "@/hooks/useAsync.js";
import { PageHeader } from "@/components/layout/AppLayout.js";
import { Card } from "@/components/ui/Card.js";
import { Button } from "@/components/ui/Button.js";
import { Badge } from "@/components/ui/Badge.js";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table.js";
import { TableSkeleton } from "@/components/ui/Skeleton.js";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState.js";
import { formatDateTime } from "@/lib/utils.js";

function summarize(before: unknown, after: unknown): string {
  const b = before as Record<string, unknown> | null;
  const a = after as Record<string, unknown> | null;
  if (b && a && "status" in b && "status" in a) return `${b.status} → ${a.status}`;
  if (a && "status" in a) return `set ${a.status}`;
  return "—";
}

export default function AuditLogPage() {
  const repo = getRepository();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, loading, error, reload } = useAsync(() => repo.listAuditLogs(page, pageSize), [page]);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Every create and edit, with the actor, timestamp, and reason." />
      <Card>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading || !data ? (
          <TableSkeleton />
        ) : data.items.length === 0 ? (
          <EmptyState title="No audit entries yet" message="Actions like marking or editing attendance will appear here." />
        ) : (
          <>
            <Table>
              <THead>
                <TH>When</TH>
                <TH>Actor</TH>
                <TH>Action</TH>
                <TH>Entity</TH>
                <TH>Change</TH>
                <TH>Reason</TH>
              </THead>
              <TBody>
                {data.items.map((log) => (
                  <TR key={log.id}>
                    <TD className="whitespace-nowrap text-ink-muted">{formatDateTime(log.timestamp)}</TD>
                    <TD>{log.actorName}</TD>
                    <TD><Badge variant={log.action === "edit" ? "warning" : log.action === "create" ? "success" : "neutral"}>{log.action}</Badge></TD>
                    <TD className="text-ink-muted">{log.entity}</TD>
                    <TD className="font-mono text-xs">{summarize(log.before, log.after)}</TD>
                    <TD className="text-ink-muted">{log.reason ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-ink-muted">
              <span>{data.total} entries</span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <span>Page {page} / {totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
