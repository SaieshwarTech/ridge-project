import { useState } from "react";
import { getRepository } from "@/repo/index.js";
import { useAuth } from "@/context/AuthContext.js";
import { useAsync } from "@/hooks/useAsync.js";
import { PageHeader } from "@/components/layout/AppLayout.js";
import { Card, CardBody } from "@/components/ui/Card.js";
import { Select, Input, Field } from "@/components/ui/Input.js";
import { StatusBadge } from "@/components/ui/Badge.js";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table.js";
import { TableSkeleton } from "@/components/ui/Skeleton.js";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState.js";
import { formatDate } from "@/lib/utils.js";

export default function HistoryPage() {
  const { user } = useAuth();
  if (user?.profile.role === "student") return <StudentHistory />;
  return <StaffHistory />;
}

function StudentHistory() {
  const repo = getRepository();
  const { data, loading, error, reload } = useAsync(() => repo.getStudentDashboard(), []);
  return (
    <div>
      <PageHeader title="Attendance History" subtitle="Your complete attendance record." />
      <Card>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading || !data ? (
          <TableSkeleton />
        ) : data.history.length === 0 ? (
          <EmptyState title="No records yet" />
        ) : (
          <Table>
            <THead>
              <TH>Date</TH>
              <TH>Subject</TH>
              <TH className="text-right">Status</TH>
            </THead>
            <TBody>
              {data.history.map((h) => (
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
    </div>
  );
}

function StaffHistory() {
  const repo = getRepository();
  const [filters, setFilters] = useState({ classId: "", subjectId: "", status: "", from: "", to: "" });
  const classes = useAsync(() => repo.listClasses(), []);
  const subjects = useAsync(() => repo.listSubjects(), []);
  const { data, loading, error, reload } = useAsync(() => repo.getReport(filters), [JSON.stringify(filters)]);

  return (
    <div>
      <PageHeader title="Attendance History" subtitle="Browse and filter completed-session attendance records." />

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
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading || !data ? (
          <TableSkeleton />
        ) : data.length === 0 ? (
          <EmptyState title="No records match your filters" />
        ) : (
          <>
            <div className="border-b border-border px-4 py-2 text-xs text-ink-muted">{data.length} records</div>
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
                {data.slice(0, 200).map((r, i) => (
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
            {data.length > 200 && (
              <div className="px-4 py-2 text-center text-xs text-ink-faint">Showing first 200 — refine filters or use Reports to export all.</div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
