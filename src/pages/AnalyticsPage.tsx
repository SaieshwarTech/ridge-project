import { getRepository } from "@/repo/index.js";
import { useAsync } from "@/hooks/useAsync.js";
import { PageHeader } from "@/components/layout/AppLayout.js";
import { Card, CardHeader, CardBody } from "@/components/ui/Card.js";
import { ChartSkeleton } from "@/components/ui/Skeleton.js";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState.js";
import { TrendChart, RatesBarChart } from "@/components/charts/Charts.js";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table.js";
import { Badge } from "@/components/ui/Badge.js";
import { pct } from "@/lib/utils.js";

export default function AnalyticsPage() {
  const repo = getRepository();
  const { data, loading, error, reload } = useAsync(() => repo.getAnalytics({}), []);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Attendance trends, subject and class comparisons, and at-risk students." />
      {error && <Card><ErrorState message={error} onRetry={reload} /></Card>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="30-Day Trend" />
          {loading || !data ? <ChartSkeleton /> : <CardBody><TrendChart data={data.trends30} /></CardBody>}
        </Card>
        <Card>
          <CardHeader title="Attendance by Subject" />
          {loading || !data ? (
            <ChartSkeleton />
          ) : (
            <CardBody>
              <RatesBarChart data={data.subjectRates.map((s) => ({ name: s.name.split(" ")[0], rate: s.rate }))} threshold={data.threshold} />
            </CardBody>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Attendance by Class" />
          {loading || !data ? (
            <ChartSkeleton />
          ) : (
            <CardBody>
              <RatesBarChart data={data.classRates.map((c) => ({ name: c.name, rate: c.rate }))} threshold={data.threshold} />
            </CardBody>
          )}
        </Card>

        <Card>
          <CardHeader title={`Students Below ${data?.threshold ?? 75}%`} subtitle="Sorted by lowest attendance" />
          {loading || !data ? (
            <ChartSkeleton />
          ) : data.atRisk.length === 0 ? (
            <EmptyState title="No at-risk students" message="Everyone is meeting the threshold." />
          ) : (
            <Table>
              <THead>
                <TH>Roll</TH>
                <TH>Name</TH>
                <TH>Class</TH>
                <TH className="text-right">Attendance</TH>
              </THead>
              <TBody>
                {data.atRisk.map((r) => (
                  <TR key={r.studentId}>
                    <TD className="font-mono text-xs">{r.roll}</TD>
                    <TD>{r.name}</TD>
                    <TD className="text-ink-muted">{r.className}</TD>
                    <TD className="text-right"><Badge variant="absent">{pct(r.percentage)}</Badge></TD>
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
