import { Users, GraduationCap, School, Percent, AlertTriangle, BookOpen } from "lucide-react";
import { getRepository } from "@/repo/index.js";
import { useAsync } from "@/hooks/useAsync.js";
import { PageHeader } from "@/components/layout/AppLayout.js";
import { StatCard } from "@/components/StatCard.js";
import { Card, CardHeader, CardBody } from "@/components/ui/Card.js";
import { StatCardSkeleton, ChartSkeleton } from "@/components/ui/Skeleton.js";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState.js";
import { TrendChart, RatesBarChart } from "@/components/charts/Charts.js";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table.js";
import { formatDate, pct } from "@/lib/utils.js";

export default function AdminDashboard() {
  const repo = getRepository();
  const { data, loading, error, reload } = useAsync(() => repo.getAdminDashboard(), []);

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Institution-wide attendance overview — every figure is computed from records." />

      {error && <Card><ErrorState message={error} onRetry={reload} /></Card>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {loading || !data ? (
          Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Students" value={data.stats.totalStudents} icon={Users} tone="violet" />
            <StatCard label="Teachers" value={data.stats.totalTeachers} icon={GraduationCap} tone="blue" />
            <StatCard label="Classes" value={data.stats.totalClasses} icon={School} tone="cyan" />
            <StatCard label="Subjects" value={data.stats.totalSubjects} icon={BookOpen} tone="violet" />
            <StatCard label="Attendance" value={pct(data.stats.overallAttendanceRate)} icon={Percent} tone="green" />
            <StatCard
              label={`Below ${data.stats.threshold}%`}
              value={data.stats.studentsBelowThreshold}
              icon={AlertTriangle}
              tone="red"
            />
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Attendance Trend" subtitle="Last 30 days" />
          {loading || !data ? <ChartSkeleton /> : <CardBody><TrendChart data={data.trends30} /></CardBody>}
        </Card>
        <Card>
          <CardHeader title="Last 7 Days" subtitle="Recent daily attendance rate" />
          {loading || !data ? <ChartSkeleton /> : <CardBody><TrendChart data={data.trends7} /></CardBody>}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Subject-wise Attendance" />
          {loading || !data ? (
            <ChartSkeleton />
          ) : (
            <CardBody>
              <RatesBarChart
                data={data.subjectRates.map((s) => ({ name: s.name.split(" ")[0], rate: s.rate }))}
                threshold={data.stats.threshold}
              />
            </CardBody>
          )}
        </Card>
        <Card>
          <CardHeader title="Class Comparison" />
          {loading || !data ? (
            <ChartSkeleton />
          ) : (
            <CardBody>
              <RatesBarChart
                data={data.classRates.map((c) => ({ name: c.name.split(" ")[0] + " " + c.name.split(" ").at(-1), rate: c.rate }))}
                threshold={data.stats.threshold}
              />
            </CardBody>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Recent Attendance Activity" />
        {loading || !data ? (
          <ChartSkeleton />
        ) : data.recent.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <Table>
            <THead>
              <TH>Date</TH>
              <TH>Class</TH>
              <TH>Subject</TH>
              <TH>Teacher</TH>
              <TH className="text-right">Present</TH>
              <TH className="text-right">Late</TH>
              <TH className="text-right">Absent</TH>
            </THead>
            <TBody>
              {data.recent.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap text-ink-muted">{formatDate(r.date)}</TD>
                  <TD>{r.className}</TD>
                  <TD>{r.subjectName}</TD>
                  <TD className="text-ink-muted">{r.teacherName}</TD>
                  <TD className="text-right text-status-present">{r.present}</TD>
                  <TD className="text-right text-status-late">{r.late}</TD>
                  <TD className="text-right text-status-absent">{r.absent}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
