import { useState } from "react";
import { Plus, BookOpen } from "lucide-react";
import { getRepository } from "@/repo/index.js";
import { useAsync } from "@/hooks/useAsync.js";
import { PageHeader } from "@/components/layout/AppLayout.js";
import { Card } from "@/components/ui/Card.js";
import { Button } from "@/components/ui/Button.js";
import { Input, Field } from "@/components/ui/Input.js";
import { Dialog } from "@/components/ui/Dialog.js";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table.js";
import { TableSkeleton } from "@/components/ui/Skeleton.js";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState.js";
import { useToast } from "@/components/ui/Toast.js";

export default function SubjectsPage() {
  const repo = getRepository();
  const { toast } = useToast();
  const subjects = useAsync(() => repo.listSubjects(), []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.code || !form.name) return toast("Fill in all fields", "error");
    setBusy(true);
    try {
      await repo.createSubject(form);
      toast("Subject created", "success");
      setForm({ code: "", name: "" });
      setOpen(false);
      subjects.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Subject Management"
        subtitle="Subjects offered across the institution."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Subject</Button>}
      />
      <Card>
        {subjects.error ? (
          <ErrorState message={subjects.error} onRetry={subjects.reload} />
        ) : subjects.loading || !subjects.data ? (
          <TableSkeleton />
        ) : subjects.data.length === 0 ? (
          <EmptyState icon={BookOpen} title="No subjects yet" />
        ) : (
          <Table>
            <THead>
              <TH>Code</TH>
              <TH>Name</TH>
            </THead>
            <TBody>
              {subjects.data.map((s) => (
                <TR key={s.id}>
                  <TD className="font-mono text-xs">{s.code}</TD>
                  <TD className="font-medium">{s.name}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add Subject"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={busy}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Subject code">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CS306" />
          </Field>
          <Field label="Subject name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Machine Learning" />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
