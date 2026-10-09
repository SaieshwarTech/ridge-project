import { AlertTriangle, TrendingUp, CheckCircle2, Clock, XCircle } from "lucide-react";
import { getRepository } from "@/repo/index.js";
import { useAsync } from "@/hooks/useAsync.js";
import { PageHeader } from "@/components/layout/AppLayout.js";
import { Card, CardHeader, CardBody } from "@/components/ui/Card.js";
import { ProgressRing } from "@/components/StatCard.js";
import { ChartSkeleton } from "@/components/ui/Skeleton.js";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState.js";
import { MiniBarChart } from "@/components/charts/Charts.js";
import { Badge, StatusBadge } from "@/components/ui/Badge.js";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table.js";
import { formatDate, pct } from "@/lib/utils.js";
import { cn } from "@/lib/utils.js";

export default function StudentDashboard() {
  const repo = getRepository();
  const { data, loading, error, reload } = useAsync(() => repo.getStudentDashboard(), []);

  if (error) return <Card><ErrorState message={error} onRetry={reload} /></Card>;

  return (
    <div>
      <PageHeader title="My Attendance" subtitle="Your personal attendance summary and subject breakdown." />

      {data?.belowThreshold && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-status-absent/30 bg-status-absent/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-absent" />
          <div>
            <p className="font-medium text-status-absent">Attendance below {data.threshold}%</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              Your overall attendance is {pct(data.overall)}. Check the subject table below to see how many consecutive
              classes you need to attend to recover.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Overall Attendance" />
          <CardBody className="flex flex-col items-center gap-4">
            {loading || !data ? (
              <div className="skeleton h-28 w-28 rounded-full" />
            ) : (
              <>
                <ProgressRing value={data.overall} />
                <div className="grid w-full grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-status-present/10 p-2">
                    <CheckCircle2 className="mx-auto h-4 w-4 text-status-present" />
                    <p className="mt-1 text-lg font-bold text-ink">{data.present}</p>
                    <p className="text-[10px] uppercase text-ink-faint">Present</p>
                  </div>
                  <div className="rounded-lg bg-status-late/10 p-2">
                    <Clock className="mx-auto h-4 w-4 text-status-late" />
                    <p className="mt-1 text-lg font-bold text-ink">{data.late}</p>
                    <p className="text-[10px] uppercase text-ink-faint">Late</p>
                  </div>
                  <div className="rounded-lg bg-status-absent/10 p-2">
                    <XCircle className="mx-auto h-4 w-4 text-status-absent" />
                    <p className="mt-1 text-lg font-bold text-ink">{data.absent}</p>
                    <p className="text-[10px] uppercase text-ink-faint">Absent</p>
                  </div>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Monthly Trend" subtitle="Attendance rate per month" />
          {loading || !data ? (
            <ChartSkeleton />
          ) : data.monthly.length === 0 ? (
            <EmptyState title="No data yet" />
          ) : (
            <CardBody>
              <MiniBarChart data={data.monthly.map((m) => ({ label: m.month, rate: m.rate }))} />
            </CardBody>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Subject-wise Attendance" subtitle={`Threshold ${data?.threshold ?? 75}%`} />
        {loading || !data ? (
          <ChartSkeleton />
        ) : data.subjects.length === 0 ? (
          <EmptyState title="No subjects yet" />
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.subjects.map((s) => (
              <div key={s.subjectId} className="rounded-xl border border-border bg-bg/40 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-ink-faint">{s.subjectCode}</p>
                    <p className="font-medium text-ink">{s.subjectName}</p>
                  </div>
                  <span
                    className={cn(
                      "text-xl font-bold",
                      s.percentage >= s.eligible && s.percentage >= (data.threshold ?? 75)
                        ? "text-status-present"
                        : s.percentage >= (data.threshold ?? 75)
                          ? "text-status-present"
                          : "text-status-absent",
                    )}
                  >
                    {pct(s.percentage)}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={cn("h-full rounded-full", s.percentage >= (data.threshold ?? 75) ? "bg-status-present" : "bg-status-absent")}
                    style={{ width: `${Math.min(100, s.percentage)}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <span>{s.present + s.late}/{s.eligible} attended</span>
                  {s.late > 0 && <Badge variant="late">{s.late} late</Badge>}
                  {s.excused > 0 && <Badge variant="excused">{s.excused} excused</Badge>}
                </div>
                {s.percentage < (data.threshold ?? 75) && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-accent-cyan">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {s.needed === null
                      ? "Not enough sessions to compute a target."
                      : `Attend ${s.needed} more consecutive ${s.needed === 1 ? "class" : "classes"} to reach ${data.threshold}%.`}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent Attendance History" />
          {loading || !data ? (
            <ChartSkeleton />
          ) : data.history.length === 0 ? (
            <EmptyState title="No history yet" />
          ) : (
            <Table>
              <THead>
                <TH>Date</TH>
                <TH>Subject</TH>
                <TH className="text-right">Status</TH>
              </THead>
              <TBody>
                {data.history.slice(0, 12).map((h) => (
                  <TR key={h.id}>
                    <TD className="whitespace-nowrap text-ink-muted">{formatDate(h.date)}</TD>
                    <TD>{h.subjectName}</TD>
                    <TD className="text-right"><StatusBadge status={h.status} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="Upcoming Classes" />
          {loading || !data ? (
            <ChartSkeleton />
          ) : data.upcoming.length === 0 ? (
            <EmptyState title="Nothing scheduled" />
          ) : (
            <CardBody className="space-y-2">
              {data.upcoming.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border bg-bg/40 p-3">
                  <span className="text-sm text-ink">{u.subjectName}</span>
                  <span className="text-xs text-ink-muted">{formatDate(u.date)}</span>
                </div>
              ))}
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
}
