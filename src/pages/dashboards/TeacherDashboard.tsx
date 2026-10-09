import { Link } from "react-router-dom";
import { School, BookOpen, CheckCircle2, ClipboardCheck } from "lucide-react";
import { getRepository } from "@/repo/index.js";
import { useAsync } from "@/hooks/useAsync.js";
import { PageHeader } from "@/components/layout/AppLayout.js";
import { StatCard } from "@/components/StatCard.js";
import { Card, CardHeader, CardBody } from "@/components/ui/Card.js";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/Skeleton.js";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState.js";
import { Button } from "@/components/ui/Button.js";
import { Badge } from "@/components/ui/Badge.js";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table.js";
import { formatDate } from "@/lib/utils.js";

export default function TeacherDashboard() {
  const repo = getRepository();
  const { data, loading, error, reload } = useAsync(() => repo.getTeacherDashboard(), []);

  return (
    <div>
      <PageHeader
        title="Teacher Dashboard"
        subtitle="Your classes, subjects, and recent sessions."
        action={
          <Link to="/mark">
            <Button><ClipboardCheck className="h-4 w-4" /> Mark Attendance</Button>
          </Link>
        }
      />

      {error && <Card><ErrorState message={error} onRetry={reload} /></Card>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Classes" value={data.classes.length} icon={School} tone="violet" />
            <StatCard label="Subjects" value={data.subjects.length} icon={BookOpen} tone="blue" />
            <StatCard label="Marked Present" value={data.totals.present} icon={CheckCircle2} tone="green" />
            <StatCard label="Marked Absent" value={data.totals.absent} icon={CheckCircle2} tone="red" />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Assigned Classes & Subjects" />
          <CardBody className="space-y-4">
            {loading || !data ? (
              <TableSkeleton rows={3} />
            ) : (
              <>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-ink-faint">Classes</p>
                  <div className="flex flex-wrap gap-2">
                    {data.classes.map((c) => (
                      <Badge key={c.id} variant="violet">{c.name}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-ink-faint">Subjects</p>
                  <div className="flex flex-wrap gap-2">
                    {data.subjects.map((s) => (
                      <Badge key={s.id} variant="neutral">{s.code} · {s.name}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Today's & Recent Sessions" />
          {loading || !data ? (
            <TableSkeleton />
          ) : data.todaySessions.length === 0 ? (
            <EmptyState title="No sessions yet" message="Mark attendance to create your first session." />
          ) : (
            <Table>
              <THead>
                <TH>Date</TH>
                <TH>Class</TH>
                <TH>Subject</TH>
                <TH>Status</TH>
                <TH className="text-right">Marked</TH>
              </THead>
              <TBody>
                {data.todaySessions.map((s) => (
                  <TR key={s.id}>
                    <TD className="whitespace-nowrap text-ink-muted">{formatDate(s.date)}</TD>
                    <TD>{s.className}</TD>
                    <TD>{s.subjectName}</TD>
                    <TD><Badge variant={s.status === "completed" ? "success" : s.status === "cancelled" ? "cancelled" : "neutral"}>{s.status}</Badge></TD>
                    <TD className="text-right text-ink-muted">{s.marked}/{s.rosterSize}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
