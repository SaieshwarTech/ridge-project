// ============================================================================
// Pure read-model selectors over a Dataset. The demo repository runs these in
// the browser; the serverless functions run the identical functions on data
// loaded from Supabase — one source of truth for every dashboard number.
// ============================================================================

import {
  computeSubjectAttendance,
  countsFromRecords,
  DEFAULT_THRESHOLD,
  eligibleCount,
  attendedCount,
  percentage,
  round2,
} from "./attendance.js";
import type { Dataset } from "./seed.js";
import type {
  AttendanceRecord,
  ClassSession,
  DashboardStats,
  NamedRate,
  SubjectAttendance,
  TrendPoint,
} from "./types.js";

export function completedSessionIndex(sessions: ClassSession[]) {
  const completed = new Set<string>();
  const byId = new Map<string, ClassSession>();
  for (const s of sessions) {
    byId.set(s.id, s);
    if (s.status === "completed") completed.add(s.id);
  }
  return { completed, byId };
}

export function adminStats(ds: Dataset, threshold = DEFAULT_THRESHOLD): DashboardStats {
  const { completed } = completedSessionIndex(ds.sessions);
  const counts = countsFromRecords(ds.attendance, completed);

  let belowCount = 0;
  for (const student of ds.students) {
    const rows = computeSubjectAttendance(student.id, ds.attendance, ds.sessions, ds.subjects, threshold);
    if (rows.length === 0) continue;
    const overall = overallPercentage(rows);
    if (overall < threshold) belowCount++;
  }

  return {
    totalStudents: ds.students.filter((s) => s.active).length,
    totalTeachers: ds.teachers.filter((t) => t.active).length,
    totalClasses: ds.classes.length,
    totalSubjects: ds.subjects.length,
    overallAttendanceRate: percentage(counts),
    studentsBelowThreshold: belowCount,
    threshold,
  };
}

export function overallPercentage(rows: SubjectAttendance[]): number {
  const present = rows.reduce((a, r) => a + r.present + r.late, 0);
  const eligible = rows.reduce((a, r) => a + r.eligible, 0);
  if (eligible === 0) return 0;
  return round2((present / eligible) * 100);
}

/** Daily attendance rate for the last `days` days (only days with sessions). */
export function attendanceTrends(ds: Dataset, days: number, upTo: string): TrendPoint[] {
  const { byId } = completedSessionIndex(ds.sessions);
  const end = new Date(`${upTo}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));

  const byDate = new Map<string, { present: number; eligible: number }>();
  for (const rec of ds.attendance) {
    const session = byId.get(rec.sessionId);
    if (!session || session.status !== "completed") continue;
    const d = new Date(`${session.date}T00:00:00Z`);
    if (d < start || d > end) continue;
    const agg = byDate.get(session.date) ?? { present: 0, eligible: 0 };
    if (rec.status === "present" || rec.status === "late") {
      agg.present++;
      agg.eligible++;
    } else if (rec.status === "absent") {
      agg.eligible++;
    }
    byDate.set(session.date, agg);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { present, eligible }]) => ({
      date,
      present,
      eligible,
      rate: eligible === 0 ? 0 : round2((present / eligible) * 100),
    }));
}

function rateFor(records: AttendanceRecord[], completed: Set<string>): { rate: number; present: number; eligible: number } {
  const counts = countsFromRecords(records, completed);
  return { rate: percentage(counts), present: attendedCount(counts), eligible: eligibleCount(counts) };
}

export function subjectRates(ds: Dataset): NamedRate[] {
  const { completed, byId } = completedSessionIndex(ds.sessions);
  const bySubject = new Map<string, AttendanceRecord[]>();
  for (const rec of ds.attendance) {
    const s = byId.get(rec.sessionId);
    if (!s) continue;
    const list = bySubject.get(s.subjectId) ?? [];
    list.push(rec);
    bySubject.set(s.subjectId, list);
  }
  return ds.subjects.map((sub) => {
    const r = rateFor(bySubject.get(sub.id) ?? [], completed);
    return { id: sub.id, name: sub.name, ...r };
  });
}

export function classRates(ds: Dataset): NamedRate[] {
  const { completed, byId } = completedSessionIndex(ds.sessions);
  const byClass = new Map<string, AttendanceRecord[]>();
  for (const rec of ds.attendance) {
    const s = byId.get(rec.sessionId);
    if (!s) continue;
    const list = byClass.get(s.classId) ?? [];
    list.push(rec);
    byClass.set(s.classId, list);
  }
  return ds.classes.map((cls) => {
    const r = rateFor(byClass.get(cls.id) ?? [], completed);
    return { id: cls.id, name: `${cls.name} ${cls.section}`, ...r };
  });
}

export interface ActivityItem {
  id: string;
  date: string;
  className: string;
  subjectName: string;
  teacherName: string;
  present: number;
  absent: number;
  late: number;
}

export function recentActivity(ds: Dataset, limit = 8): ActivityItem[] {
  const { byId } = completedSessionIndex(ds.sessions);
  const classById = new Map(ds.classes.map((c) => [c.id, c]));
  const subjectById = new Map(ds.subjects.map((s) => [s.id, s]));
  const teacherById = new Map(ds.teachers.map((t) => [t.id, t]));

  const perSession = new Map<string, { present: number; absent: number; late: number }>();
  for (const rec of ds.attendance) {
    const s = byId.get(rec.sessionId);
    if (!s || s.status !== "completed") continue;
    const agg = perSession.get(rec.sessionId) ?? { present: 0, absent: 0, late: 0 };
    if (rec.status === "present") agg.present++;
    else if (rec.status === "absent") agg.absent++;
    else if (rec.status === "late") agg.late++;
    perSession.set(rec.sessionId, agg);
  }

  return [...perSession.entries()]
    .map(([sessionId, agg]) => {
      const s = byId.get(sessionId)!;
      return {
        id: sessionId,
        date: s.date,
        className: (() => {
          const c = classById.get(s.classId);
          return c ? `${c.name} ${c.section}` : s.classId;
        })(),
        subjectName: subjectById.get(s.subjectId)?.name ?? s.subjectId,
        teacherName: teacherById.get(s.teacherId)?.fullName ?? s.teacherId,
        ...agg,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

// ---- Student view model ----------------------------------------------------

export interface StudentOverview {
  subjects: SubjectAttendance[];
  overall: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  belowThreshold: boolean;
  threshold: number;
  monthly: { month: string; rate: number }[];
  history: {
    id: string;
    date: string;
    subjectName: string;
    status: string;
  }[];
  upcoming: { id: string; date: string; subjectName: string }[];
}

export function studentOverview(
  ds: Dataset,
  studentId: string,
  threshold = DEFAULT_THRESHOLD,
  today = "2026-10-09",
): StudentOverview {
  const subjectById = new Map(ds.subjects.map((s) => [s.id, s]));
  const { byId } = completedSessionIndex(ds.sessions);
  const student = ds.students.find((s) => s.id === studentId);

  const rows = computeSubjectAttendance(studentId, ds.attendance, ds.sessions, ds.subjects, threshold);
  const present = rows.reduce((a, r) => a + r.present, 0);
  const late = rows.reduce((a, r) => a + r.late, 0);
  const absent = rows.reduce((a, r) => a + r.absent, 0);
  const excused = rows.reduce((a, r) => a + r.excused, 0);
  const overall = overallPercentage(rows);

  // Monthly chart
  const monthAgg = new Map<string, { present: number; eligible: number }>();
  const history: StudentOverview["history"] = [];
  for (const rec of ds.attendance) {
    if (rec.studentId !== studentId) continue;
    const s = byId.get(rec.sessionId);
    if (!s || s.status !== "completed") continue;
    const month = s.date.slice(0, 7);
    const agg = monthAgg.get(month) ?? { present: 0, eligible: 0 };
    if (rec.status === "present" || rec.status === "late") {
      agg.present++;
      agg.eligible++;
    } else if (rec.status === "absent") {
      agg.eligible++;
    }
    monthAgg.set(month, agg);
    history.push({
      id: rec.id,
      date: s.date,
      subjectName: subjectById.get(s.subjectId)?.name ?? s.subjectId,
      status: rec.status,
    });
  }

  const monthly = [...monthAgg.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { present: p, eligible }]) => ({
      month,
      rate: eligible === 0 ? 0 : round2((p / eligible) * 100),
    }));

  history.sort((a, b) => b.date.localeCompare(a.date));

  // Upcoming scheduled sessions for the student's class.
  const upcoming = ds.sessions
    .filter((s) => s.status === "scheduled" && student && s.classId === student.classId && s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
    .map((s) => ({ id: s.id, date: s.date, subjectName: subjectById.get(s.subjectId)?.name ?? s.subjectId }));

  return {
    subjects: rows,
    overall,
    present,
    late,
    absent,
    excused,
    belowThreshold: rows.length > 0 && overall < threshold,
    threshold,
    monthly,
    history: history.slice(0, 50),
    upcoming,
  };
}

// ---- Teacher view model ----------------------------------------------------

export interface TeacherOverview {
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string; code: string }[];
  todaySessions: {
    id: string;
    className: string;
    subjectName: string;
    date: string;
    status: string;
    marked: number;
    rosterSize: number;
  }[];
  totals: { present: number; absent: number; late: number };
  recent: ActivityItem[];
}

export function teacherOverview(ds: Dataset, teacherId: string, today = "2026-10-09"): TeacherOverview {
  const classById = new Map(ds.classes.map((c) => [c.id, c]));
  const subjectById = new Map(ds.subjects.map((s) => [s.id, s]));
  const myAssignments = ds.assignments.filter((a) => a.teacherId === teacherId);
  const classIds = new Set(myAssignments.map((a) => a.classId));
  const subjectIds = new Set(myAssignments.map((a) => a.subjectId));

  const mySessions = ds.sessions.filter((s) => s.teacherId === teacherId);
  const rosterSize = (classId: string) => ds.enrollments.filter((e) => e.classId === classId).length;
  const markedCount = (sessionId: string) => ds.attendance.filter((r) => r.sessionId === sessionId).length;

  const { byId } = completedSessionIndex(ds.sessions);
  const totals = { present: 0, absent: 0, late: 0 };
  for (const rec of ds.attendance) {
    const s = byId.get(rec.sessionId);
    if (!s || s.teacherId !== teacherId || s.status !== "completed") continue;
    if (rec.status === "present") totals.present++;
    else if (rec.status === "absent") totals.absent++;
    else if (rec.status === "late") totals.late++;
  }

  const todaySessions = mySessions
    .filter((s) => s.date === today || (s.status === "completed" && s.date <= today))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)
    .map((s) => ({
      id: s.id,
      className: (() => {
        const c = classById.get(s.classId);
        return c ? `${c.name} ${c.section}` : s.classId;
      })(),
      subjectName: subjectById.get(s.subjectId)?.name ?? s.subjectId,
      date: s.date,
      status: s.status,
      marked: markedCount(s.id),
      rosterSize: rosterSize(s.classId),
    }));

  const recent = recentActivity(
    { ...ds, sessions: mySessions, attendance: ds.attendance.filter((r) => byId.get(r.sessionId)?.teacherId === teacherId) },
    6,
  );

  return {
    classes: [...classIds].map((id) => {
      const c = classById.get(id);
      return { id, name: c ? `${c.name} ${c.section}` : id };
    }),
    subjects: [...subjectIds].map((id) => {
      const s = subjectById.get(id)!;
      return { id, name: s.name, code: s.code };
    }),
    todaySessions,
    totals,
    recent,
  };
}

// ---- Analytics & reports ---------------------------------------------------

export interface ReportFilters {
  classId?: string;
  subjectId?: string;
  status?: string;
  from?: string;
  to?: string;
}

export interface ReportRow {
  studentRoll: string;
  studentName: string;
  className: string;
  subjectName: string;
  date: string;
  status: string;
}

export function reportRows(ds: Dataset, filters: ReportFilters): ReportRow[] {
  const classById = new Map(ds.classes.map((c) => [c.id, c]));
  const subjectById = new Map(ds.subjects.map((s) => [s.id, s]));
  const studentById = new Map(ds.students.map((s) => [s.id, s]));
  const { byId } = completedSessionIndex(ds.sessions);

  const out: ReportRow[] = [];
  for (const rec of ds.attendance) {
    const session = byId.get(rec.sessionId);
    if (!session || session.status !== "completed") continue;
    if (filters.classId && session.classId !== filters.classId) continue;
    if (filters.subjectId && session.subjectId !== filters.subjectId) continue;
    if (filters.status && rec.status !== filters.status) continue;
    if (filters.from && session.date < filters.from) continue;
    if (filters.to && session.date > filters.to) continue;
    const student = studentById.get(rec.studentId);
    const cls = classById.get(session.classId);
    out.push({
      studentRoll: student?.rollNo ?? rec.studentId,
      studentName: student?.fullName ?? rec.studentId,
      className: cls ? `${cls.name} ${cls.section}` : session.classId,
      subjectName: subjectById.get(session.subjectId)?.name ?? session.subjectId,
      date: session.date,
      status: rec.status,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.studentName.localeCompare(b.studentName));
}

export interface AtRiskRow {
  studentId: string;
  roll: string;
  name: string;
  className: string;
  percentage: number;
}

export function studentsBelowThreshold(ds: Dataset, threshold = DEFAULT_THRESHOLD): AtRiskRow[] {
  const classById = new Map(ds.classes.map((c) => [c.id, c]));
  const out: AtRiskRow[] = [];
  for (const student of ds.students) {
    const rows = computeSubjectAttendance(student.id, ds.attendance, ds.sessions, ds.subjects, threshold);
    if (rows.length === 0) continue;
    const pct = overallPercentage(rows);
    if (pct < threshold) {
      const c = classById.get(student.classId);
      out.push({
        studentId: student.id,
        roll: student.rollNo,
        name: student.fullName,
        className: c ? `${c.name} ${c.section}` : student.classId,
        percentage: pct,
      });
    }
  }
  return out.sort((a, b) => a.percentage - b.percentage);
}

export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return (headers ?? []).join(",") + "\n";
  const cols = headers ?? Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const row of rows) lines.push(cols.map((c) => escape(row[c])).join(","));
  return lines.join("\n") + "\n";
}
