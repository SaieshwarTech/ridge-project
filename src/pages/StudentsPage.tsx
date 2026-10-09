import { useState } from "react";
import { Plus, Search, UserX, UserCheck } from "lucide-react";
import { getRepository } from "@/repo/index.js";
import { useAsync } from "@/hooks/useAsync.js";
import { PageHeader } from "@/components/layout/AppLayout.js";
import { Card } from "@/components/ui/Card.js";
import { Button } from "@/components/ui/Button.js";
import { Input, Select, Field } from "@/components/ui/Input.js";
import { Badge } from "@/components/ui/Badge.js";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog.js";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table.js";
import { TableSkeleton } from "@/components/ui/Skeleton.js";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState.js";
import { useToast } from "@/components/ui/Toast.js";
import type { Student } from "@shared/types.js";

export default function StudentsPage() {
  const repo = getRepository();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const classes = useAsync(() => repo.listClasses(), []);
  const { data, loading, error, reload } = useAsync(
    () => repo.listStudents({ search, classId, page, pageSize }),
    [search, classId, page],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [toToggle, setToToggle] = useState<Student | null>(null);
  const [busy, setBusy] = useState(false);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const toggleActive = async () => {
    if (!toToggle) return;
    setBusy(true);
    try {
      await repo.setStudentActive(toToggle.id, !toToggle.active);
      toast(`Student ${toToggle.active ? "deactivated" : "activated"}`, "success");
      setToToggle(null);
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Student Management"
        subtitle="Create, search, and deactivate student accounts."
        action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add Student</Button>}
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input
              className="pl-9"
              placeholder="Search by name, roll no, or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            className="sm:w-56"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All classes</option>
            {classes.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.section}</option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading || !data ? (
          <TableSkeleton />
        ) : data.items.length === 0 ? (
          <EmptyState title="No students found" message="Adjust your filters or add a new student." />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Roll No</TH>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Class</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {data.items.map((s) => {
                  const cls = classes.data?.find((c) => c.id === s.classId);
                  return (
                    <TR key={s.id}>
                      <TD className="font-mono text-xs">{s.rollNo}</TD>
                      <TD className="font-medium">{s.fullName}</TD>
                      <TD className="text-ink-muted">{s.email}</TD>
                      <TD>{cls ? `${cls.name} ${cls.section}` : "—"}</TD>
                      <TD><Badge variant={s.active ? "success" : "neutral"}>{s.active ? "Active" : "Inactive"}</Badge></TD>
                      <TD className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setToToggle(s)}>
                          {s.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          {s.active ? "Deactivate" : "Activate"}
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-ink-muted">
              <span>{data.total} students</span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <span>Page {page} / {totalPages}</span>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <CreateStudentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          reload();
        }}
        classes={classes.data ?? []}
      />

      <ConfirmDialog
        open={!!toToggle}
        onClose={() => setToToggle(null)}
        onConfirm={toggleActive}
        loading={busy}
        danger={toToggle?.active}
        title={toToggle?.active ? "Deactivate student?" : "Activate student?"}
        message={
          toToggle?.active
            ? `${toToggle?.fullName} will no longer be able to sign in. Attendance records are preserved.`
            : `${toToggle?.fullName} will be able to sign in again.`
        }
        confirmLabel={toToggle?.active ? "Deactivate" : "Activate"}
      />
    </div>
  );
}

function CreateStudentDialog({
  open,
  onClose,
  onCreated,
  classes,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  classes: { id: string; name: string; section: string }[];
}) {
  const repo = getRepository();
  const { toast } = useToast();
  const [form, setForm] = useState({ fullName: "", email: "", rollNo: "", classId: "" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.fullName || !form.email || !form.rollNo || !form.classId) {
      toast("Please fill in all fields", "error");
      return;
    }
    setBusy(true);
    try {
      await repo.createStudent(form);
      toast("Student created", "success");
      setForm({ fullName: "", email: "", rollNo: "", classId: "" });
      onCreated();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to create student", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add Student"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Create</Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Full name">
          <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Jane Nair" />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@student.coastal.edu" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Roll number">
            <Input value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} placeholder="CIT2026031" />
          </Field>
          <Field label="Class">
            <Select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
              <option value="">Select…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.section}</option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
