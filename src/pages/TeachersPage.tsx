import { useState } from "react";
import { Plus } from "lucide-react";
import { getRepository } from "@/repo/index.js";
import { useAsync } from "@/hooks/useAsync.js";
import { PageHeader } from "@/components/layout/AppLayout.js";
import { Card } from "@/components/ui/Card.js";
import { Button } from "@/components/ui/Button.js";
import { Input, Field } from "@/components/ui/Input.js";
import { Badge } from "@/components/ui/Badge.js";
import { Dialog } from "@/components/ui/Dialog.js";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table.js";
import { TableSkeleton } from "@/components/ui/Skeleton.js";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState.js";
import { useToast } from "@/components/ui/Toast.js";

export default function TeachersPage() {
  const repo = getRepository();
  const { toast } = useToast();
  const teachers = useAsync(() => repo.listTeachers(), []);
  const assignments = useAsync(() => repo.listAssignments(), []);
  const subjects = useAsync(() => repo.listSubjects(), []);
  const classes = useAsync(() => repo.listClasses(), []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", department: "" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.fullName || !form.email || !form.department) return toast("Fill in all fields", "error");
    setBusy(true);
    try {
      await repo.createTeacher(form);
      toast("Teacher created", "success");
      setForm({ fullName: "", email: "", department: "" });
      setOpen(false);
      teachers.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const assignmentsFor = (teacherId: string) => {
    const list = assignments.data?.filter((a) => a.teacherId === teacherId) ?? [];
    return list.map((a) => {
      const sub = subjects.data?.find((s) => s.id === a.subjectId);
      const cls = classes.data?.find((c) => c.id === a.classId);
      return `${sub?.code ?? ""} · ${cls?.name ?? ""}`;
    });
  };

  return (
    <div>
      <PageHeader
        title="Teacher Management"
        subtitle="Manage teachers and view their class/subject assignments."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Teacher</Button>}
      />

      <Card>
        {teachers.error ? (
          <ErrorState message={teachers.error} onRetry={teachers.reload} />
        ) : teachers.loading || !teachers.data ? (
          <TableSkeleton />
        ) : teachers.data.length === 0 ? (
          <EmptyState title="No teachers yet" />
        ) : (
          <Table>
            <THead>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Department</TH>
              <TH>Assignments</TH>
            </THead>
            <TBody>
              {teachers.data.map((t) => (
                <TR key={t.id}>
                  <TD className="font-medium">{t.fullName}</TD>
                  <TD className="text-ink-muted">{t.email}</TD>
                  <TD>{t.department}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1.5">
                      {assignmentsFor(t.id).map((a, i) => (
                        <Badge key={i} variant="neutral">{a}</Badge>
                      ))}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add Teacher"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={busy}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Full name">
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Dr. Asha Rao" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="asha@coastal.edu" />
          </Field>
          <Field label="Department">
            <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Computer Science" />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
