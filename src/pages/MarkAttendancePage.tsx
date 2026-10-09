import { useState } from "react";
import { CheckCircle2, Save, Users, ListChecks } from "lucide-react";
import { getRepository } from "@/repo/index.js";
import { useAsync } from "@/hooks/useAsync.js";
import { PageHeader } from "@/components/layout/AppLayout.js";
import { Card, CardHeader, CardBody } from "@/components/ui/Card.js";
import { Button } from "@/components/ui/Button.js";
import { Select, Field, Input } from "@/components/ui/Input.js";
import { EmptyState } from "@/components/ui/EmptyState.js";
import { useToast } from "@/components/ui/Toast.js";
import { cn, todayISO } from "@/lib/utils.js";
import type { AttendanceStatus, ClassSession, Student } from "@shared/types.js";
import type { AttendanceEntry } from "@/repo/types.js";

const STATUSES: { value: AttendanceStatus; label: string; cls: string; active: string }[] = [
  { value: "present", label: "Present", cls: "text-status-present border-status-present/30", active: "bg-status-present text-white border-status-present" },
  { value: "late", label: "Late", cls: "text-status-late border-status-late/30", active: "bg-status-late text-white border-status-late" },
  { value: "absent", label: "Absent", cls: "text-status-absent border-status-absent/30", active: "bg-status-absent text-white border-status-absent" },
  { value: "excused", label: "Excused", cls: "text-accent-blue border-accent-blue/30", active: "bg-accent-blue text-white border-accent-blue" },
];

export default function MarkAttendancePage() {
  const repo = getRepository();
  const { toast } = useToast();
  const overview = useAsync(() => repo.getTeacherDashboard(), []);

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [session, setSession] = useState<ClassSession | null>(null);
  const [roster, setRoster] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [hadExisting, setHadExisting] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!classId || !subjectId || !date) return toast("Select class, subject, and date", "error");
    setLoading(true);
    try {
      const s = await repo.getOrCreateSession(classId, subjectId, date);
      const [students, existing] = await Promise.all([repo.getRoster(classId), repo.getSessionAttendance(s.id)]);
      const existingMap: Record<string, AttendanceStatus> = {};
      for (const rec of existing) existingMap[rec.studentId] = rec.status;
      const initial: Record<string, AttendanceStatus> = {};
      for (const st of students) initial[st.id] = existingMap[st.id] ?? "present";
      setSession(s);
      setRoster(students);
      setMarks(initial);
      setHadExisting(existing.length > 0);
      setReason("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load roster", "error");
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const markAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    for (const st of roster) next[st.id] = status;
    setMarks(next);
  };

  const save = async () => {
    if (!session) return;
    if (hadExisting && !reason.trim()) return toast("A reason is required when editing existing attendance", "error");
    setSaving(true);
    try {
      const entries: AttendanceEntry[] = roster.map((st) => ({ studentId: st.id, status: marks[st.id] }));
      await repo.saveAttendance(session.id, entries, reason.trim() || undefined);
      toast("Attendance saved", "success");
      setHadExisting(true);
      overview.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const counts = roster.reduce(
    (acc, st) => {
      acc[marks[st.id]] = (acc[marks[st.id]] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div>
      <PageHeader title="Mark Attendance" subtitle="Select a class, subject, and date, then record each student's status." />

      <Card className="mb-4">
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Class">
              <Select value={classId} onChange={(e) => { setClassId(e.target.value); setSession(null); }}>
                <option value="">Select class…</option>
                {overview.data?.classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Subject">
              <Select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setSession(null); }}>
                <option value="">Select subject…</option>
                {overview.data?.subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={date} max={todayISO()} onChange={(e) => { setDate(e.target.value); setSession(null); }} />
            </Field>
            <div className="flex items-end">
              <Button className="w-full" onClick={load} loading={loading}>
                <Users className="h-4 w-4" /> Load Roster
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {!session ? (
        <Card>
          <EmptyState icon={ListChecks} title="No roster loaded" message="Choose a class, subject, and date above, then load the roster to begin." />
        </Card>
      ) : (
        <Card>
          <CardHeader
            title={`${roster.length} students`}
            subtitle={
              `Present ${counts.present ?? 0} · Late ${counts.late ?? 0} · Absent ${counts.absent ?? 0} · Excused ${counts.excused ?? 0}`
            }
            action={
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => markAll("present")}>
                  <CheckCircle2 className="h-4 w-4" /> All present
                </Button>
                <Button size="sm" onClick={save} loading={saving}>
                  <Save className="h-4 w-4" /> Save
                </Button>
              </div>
            }
          />
          {hadExisting && (
            <div className="border-b border-border px-5 py-3">
              <Field label="Reason for edit (recorded in the audit log)">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Corrected after roll-call review" />
              </Field>
            </div>
          )}
          <CardBody className="space-y-2">
            {roster.map((st) => (
              <div key={st.id} className="flex flex-col gap-2 rounded-lg border border-border bg-bg/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-ink">{st.fullName}</p>
                  <p className="font-mono text-xs text-ink-faint">{st.rollNo}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setMarks((m) => ({ ...m, [st.id]: s.value }))}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                        marks[st.id] === s.value ? s.active : cn("bg-transparent hover:bg-white/5", s.cls),
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
