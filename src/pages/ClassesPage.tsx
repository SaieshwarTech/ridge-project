import { useState } from "react";
import { Plus, School } from "lucide-react";
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

export default function ClassesPage() {
  const repo = getRepository();
  const { toast } = useToast();
  const classes = useAsync(() => repo.listClasses(), []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", section: "", academicYear: "2026-27" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.name || !form.section) return toast("Fill in all fields", "error");
    setBusy(true);
    try {
      await repo.createClass(form);
      toast("Class created", "success");
      setForm({ name: "", section: "", academicYear: "2026-27" });
      setOpen(false);
      classes.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Class Management"
        subtitle="Academic classes and sections."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Class</Button>}
      />
      <Card>
        {classes.error ? (
          <ErrorState message={classes.error} onRetry={classes.reload} />
        ) : classes.loading || !classes.data ? (
          <TableSkeleton />
        ) : classes.data.length === 0 ? (
          <EmptyState icon={School} title="No classes yet" />
        ) : (
          <Table>
            <THead>
              <TH>Name</TH>
              <TH>Section</TH>
              <TH>Academic Year</TH>
            </THead>
            <TBody>
              {classes.data.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.name}</TD>
                  <TD>{c.section}</TD>
                  <TD className="text-ink-muted">{c.academicYear}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add Class"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={busy}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Class name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="TY B.Sc IT" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Section">
              <Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" />
            </Field>
            <Field label="Academic year">
              <Input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} />
            </Field>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
