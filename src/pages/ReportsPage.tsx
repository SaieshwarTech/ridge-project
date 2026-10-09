import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { getRepository } from "@/repo/index.js";
import { useAsync } from "@/hooks/useAsync.js";
import { PageHeader } from "@/components/layout/AppLayout.js";
import { Card, CardHeader, CardBody } from "@/components/ui/Card.js";
import { Button } from "@/components/ui/Button.js";
import { Select, Input, Field } from "@/components/ui/Input.js";
import { StatusBadge } from "@/components/ui/Badge.js";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table.js";
import { TableSkeleton } from "@/components/ui/Skeleton.js";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState.js";
import { useToast } from "@/components/ui/Toast.js";
import { toCsv } from "@shared/selectors.js";
import { downloadCsv, formatDate, todayISO } from "@/lib/utils.js";

export default function ReportsPage() {
  const repo = getRepository();
  const { toast } = useToast();
  const [filters, setFilters] = useState({ classId: "", subjectId: "", status: "", from: "", to: "" });
  const classes = useAsync(() => repo.listClasses(), []);
  const subjects = useAsync(() => repo.listSubjects(), []);
  const { data, loading, error, reload } = useAsync(() => repo.getReport(filters), [JSON.stringify(filters)]);

  const exportCsv = () => {
    if (!data || data.length === 0) return toast("Nothing to export", "error");
    const csv = toCsv(
      data.map((r) => ({
        Date: r.date,
        Roll: r.studentRoll,
        Student: r.studentName,
        Class: r.className,
        Subject: r.subjectName,
        Status: r.status,
      })),
      ["Date", "Roll", "Student", "Class", "Subject", "Status"],
    );
    downloadCsv(`attendance-report-${todayISO()}.csv`, csv);
    toast(`Exported ${data.length} rows`, "success");
  };

  return (
    <div>
      <PageHeader
        title="Reports & Export"
        subtitle="Filter attendance records and export to CSV."
        action={<Button onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>}
      />

      <Card className="mb-4">
        <CardBody className="grid gap-3 sm:grid-cols-5">
          <Field label="Class">
            <Select value={filters.classId} onChange={(e) => setFilters({ ...filters, classId: e.target.value })}>
              <option value="">All</option>
              {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
            </Select>
          </Field>
          <Field label="Subject">
            <Select value={filters.subjectId} onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}>
              <option value="">All</option>
              {subjects.data?.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </Select>
          </Field>
          <Field label="From">
            <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </Field>
          <Field label="To">
            <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Preview" subtitle={data ? `${data.length} records` : undefined} />
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading || !data ? (
          <TableSkeleton />
        ) : data.length === 0 ? (
          <EmptyState icon={FileSpreadsheet} title="No records match your filters" />
        ) : (
          <Table>
            <THead>
              <TH>Date</TH>
              <TH>Roll</TH>
              <TH>Student</TH>
              <TH>Class</TH>
              <TH>Subject</TH>
              <TH className="text-right">Status</TH>
            </THead>
            <TBody>
              {data.slice(0, 100).map((r, i) => (
                <TR key={i}>
                  <TD className="whitespace-nowrap text-ink-muted">{formatDate(r.date)}</TD>
                  <TD className="font-mono text-xs">{r.studentRoll}</TD>
                  <TD>{r.studentName}</TD>
                  <TD>{r.className}</TD>
                  <TD>{r.subjectName}</TD>
                  <TD className="text-right"><StatusBadge status={r.status} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
