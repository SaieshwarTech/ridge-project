import { getSupabase } from "@/lib/supabaseClient.js";
import { generateDataset, DEMO_ACCOUNT_REFS, type Dataset } from "@shared/seed.js";
import {
  adminStats,
  attendanceTrends,
  subjectRates,
  classRates,
  recentActivity,
  studentOverview,
  teacherOverview,
  reportRows,
  studentsBelowThreshold,
  type ReportFilters,
  type ReportRow,
  type StudentOverview,
  type TeacherOverview,
} from "@shared/selectors.js";
import type {
  AttendanceRecord,
  AuditLog,
  Class,
  ClassSession,
  Paginated,
  Role,
  SessionUser,
  Student,
  Subject,
  Teacher,
  TeacherAssignment,
} from "@shared/types.js";
import type {
  AdminDashboard,
  AnalyticsPayload,
  AttendanceEntry,
  DemoAccount,
  Repository,
  StudentListQuery,
} from "./types.js";

const THRESHOLD = Number(import.meta.env.VITE_ATTENDANCE_THRESHOLD ?? 75);
// Shared password set by scripts/seed-supabase.ts for all seeded demo users.
const SEED_PASSWORD = "AttendX!demo123";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Browser-direct Supabase repository (serverless BaaS mode). Talks straight to
 * Supabase with the public anon key and the signed-in user's JWT. Row Level
 * Security enforces every permission in the database — no server/API tier.
 *
 * Privileged operations that require creating auth users (createStudent /
 * createTeacher) are intentionally unavailable here; they need the server-side
 * service-role key. Everything else runs live against the cloud database.
 */
export class SupabaseDirectRepository implements Repository {
  readonly mode = "cloud" as const;

  private get db() {
    return getSupabase();
  }

  // ---- Auth --------------------------------------------------------------

  // Offer a one-click selector of the seeded cloud accounts. The `profileId`
  // field carries the email; loginDemo signs in with the shared seed password.
  async listDemoAccounts(): Promise<DemoAccount[]> {
    const ds = generateDataset();
    return DEMO_ACCOUNT_REFS.map((ref) => {
      const profile = ds.profiles.find((p) => p.id === ref.profileId)!;
      return { label: ref.label, profileId: profile.email, role: ref.role, name: profile.fullName, email: profile.email };
    });
  }

  async loginDemo(emailHandle: string): Promise<SessionUser> {
    return this.loginWithPassword(emailHandle, SEED_PASSWORD);
  }

  async loginWithPassword(email: string, password: string): Promise<SessionUser> {
    const { error } = await this.db.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const user = await this.currentUser();
    if (!user) throw new Error("Signed in, but no profile is linked to this account.");
    return user;
  }

  async logout(): Promise<void> {
    await this.db.auth.signOut();
  }

  async currentUser(): Promise<SessionUser | null> {
    const { data } = await this.db.auth.getSession();
    const authId = data.session?.user.id;
    if (!authId) return null;

    const { data: p } = await this.db
      .from("profiles")
      .select("id,email,full_name,role,active,created_at")
      .eq("id", authId)
      .maybeSingle();
    if (!p) return null;

    const session: SessionUser = {
      profile: { id: p.id, email: p.email, fullName: p.full_name, role: p.role as Role, active: p.active, createdAt: p.created_at },
    };
    if (p.role === "student") {
      const { data: s } = await this.db.from("students").select("id").eq("profile_id", authId).maybeSingle();
      session.studentId = s?.id;
    } else if (p.role === "teacher") {
      const { data: t } = await this.db.from("teachers").select("id").eq("profile_id", authId).maybeSingle();
      session.teacherId = t?.id;
    }
    return session;
  }

  private async requireUser(): Promise<SessionUser> {
    const u = await this.currentUser();
    if (!u) throw new Error("Not authenticated");
    return u;
  }

  // ---- Dataset loader (RLS-filtered) -------------------------------------

  private async loadDataset(): Promise<Dataset> {
    const db = this.db;
    const [profiles, students, teachers, classes, subjects, enrollments, assignments, sessions, attendance] =
      await Promise.all([
        db.from("profiles").select("*"),
        db.from("students").select("*"),
        db.from("teachers").select("*"),
        db.from("classes").select("*"),
        db.from("subjects").select("*"),
        db.from("class_enrollments").select("*"),
        db.from("teacher_assignments").select("*"),
        db.from("class_sessions").select("*"),
        db.from("attendance_records").select("*"),
      ]);

    const profileById = new Map((profiles.data ?? []).map((p) => [p.id, p]));
    return {
      profiles: (profiles.data ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        role: p.role,
        active: p.active,
        createdAt: p.created_at,
      })),
      students: (students.data ?? []).map((s) => ({
        id: s.id,
        profileId: s.profile_id,
        rollNo: s.roll_no,
        classId: s.class_id,
        active: s.active,
        fullName: profileById.get(s.profile_id)?.full_name ?? "",
        email: profileById.get(s.profile_id)?.email ?? "",
      })),
      teachers: (teachers.data ?? []).map((t) => ({
        id: t.id,
        profileId: t.profile_id,
        department: t.department,
        active: t.active,
        fullName: profileById.get(t.profile_id)?.full_name ?? "",
        email: profileById.get(t.profile_id)?.email ?? "",
      })),
      classes: (classes.data ?? []).map((c) => ({ id: c.id, name: c.name, section: c.section, academicYear: c.academic_year })),
      subjects: (subjects.data ?? []).map((s) => ({ id: s.id, code: s.code, name: s.name })),
      enrollments: (enrollments.data ?? []).map((e) => ({ id: e.id, classId: e.class_id, studentId: e.student_id })),
      assignments: (assignments.data ?? []).map((a) => ({ id: a.id, teacherId: a.teacher_id, classId: a.class_id, subjectId: a.subject_id })),
      sessions: (sessions.data ?? []).map((s) => ({ id: s.id, classId: s.class_id, subjectId: s.subject_id, teacherId: s.teacher_id, date: s.date, status: s.status })),
      attendance: (attendance.data ?? []).map((r) => ({ id: r.id, sessionId: r.session_id, studentId: r.student_id, status: r.status, markedAt: r.marked_at, markedBy: r.marked_by })),
    };
  }

  // ---- Admin reads -------------------------------------------------------

  async getAdminDashboard(): Promise<AdminDashboard> {
    const ds = await this.loadDataset();
    return {
      stats: adminStats(ds, THRESHOLD),
      trends7: attendanceTrends(ds, 7, today()),
      trends30: attendanceTrends(ds, 30, today()),
      subjectRates: subjectRates(ds),
      classRates: classRates(ds),
      recent: recentActivity(ds, 8),
    };
  }

  async listStudents(q: StudentListQuery): Promise<Paginated<Student>> {
    const ds = await this.loadDataset();
    let items = ds.students;
    if (q.classId) items = items.filter((s) => s.classId === q.classId);
    if (q.search) {
      const t = q.search.toLowerCase();
      items = items.filter((s) => s.fullName.toLowerCase().includes(t) || s.rollNo.toLowerCase().includes(t) || s.email.toLowerCase().includes(t));
    }
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
  }

  async listTeachers(): Promise<Teacher[]> {
    return (await this.loadDataset()).teachers;
  }

  async listClasses(): Promise<Class[]> {
    const { data } = await this.db.from("classes").select("*").order("name");
    return (data ?? []).map((c) => ({ id: c.id, name: c.name, section: c.section, academicYear: c.academic_year }));
  }

  async listSubjects(): Promise<Subject[]> {
    const { data } = await this.db.from("subjects").select("*").order("code");
    return (data ?? []).map((s) => ({ id: s.id, code: s.code, name: s.name }));
  }

  async listAssignments(): Promise<TeacherAssignment[]> {
    const { data } = await this.db.from("teacher_assignments").select("*");
    return (data ?? []).map((a) => ({ id: a.id, teacherId: a.teacher_id, classId: a.class_id, subjectId: a.subject_id }));
  }

  async listAuditLogs(page = 1, pageSize = 20): Promise<Paginated<AuditLog>> {
    const from = (page - 1) * pageSize;
    const { data, count } = await this.db
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    return {
      items: (data ?? []).map((l) => ({
        id: l.id,
        actorId: l.actor_id,
        actorName: l.actor_name,
        action: l.action,
        entity: l.entity,
        entityId: l.entity_id,
        before: l.before,
        after: l.after,
        reason: l.reason,
        timestamp: l.created_at,
      })),
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  // ---- Admin writes (RLS-guarded) ----------------------------------------

  async createStudent(): Promise<Student> {
    throw new Error("Creating students needs the server (service-role) key and isn't available in browser-direct Supabase mode.");
  }

  async createTeacher(): Promise<Teacher> {
    throw new Error("Creating teachers needs the server (service-role) key and isn't available in browser-direct Supabase mode.");
  }

  async setStudentActive(id: string, active: boolean): Promise<Student> {
    const cur = await this.db.from("students").select("profile_id,active").eq("id", id).single();
    if (cur.error || !cur.data) throw new Error("Student not found");
    const upd = await this.db.from("students").update({ active }).eq("id", id).select("*").single();
    if (upd.error) throw new Error(upd.error.message);
    await this.db.from("profiles").update({ active }).eq("id", cur.data.profile_id);
    await this.audit(active ? "activate" : "deactivate", "student", id, { active: cur.data.active }, { active }, null);
    const { data: p } = await this.db.from("profiles").select("full_name,email").eq("id", cur.data.profile_id).single();
    return {
      id: upd.data.id,
      profileId: upd.data.profile_id,
      rollNo: upd.data.roll_no,
      classId: upd.data.class_id,
      active: upd.data.active,
      fullName: p?.full_name ?? "",
      email: p?.email ?? "",
    };
  }

  async createClass(input: { name: string; section: string; academicYear: string }): Promise<Class> {
    const ins = await this.db.from("classes").insert({ name: input.name, section: input.section, academic_year: input.academicYear }).select("*").single();
    if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "Could not create class");
    return { id: ins.data.id, name: ins.data.name, section: ins.data.section, academicYear: ins.data.academic_year };
  }

  async createSubject(input: { code: string; name: string }): Promise<Subject> {
    const ins = await this.db.from("subjects").insert({ code: input.code, name: input.name }).select("*").single();
    if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "Could not create subject");
    return { id: ins.data.id, code: ins.data.code, name: ins.data.name };
  }

  // ---- Teacher -----------------------------------------------------------

  async getTeacherDashboard(): Promise<TeacherOverview> {
    const user = await this.requireUser();
    const ds = await this.loadDataset();
    return teacherOverview(ds, user.teacherId!, today());
  }

  async getRoster(classId: string): Promise<Student[]> {
    const ds = await this.loadDataset();
    const enrolled = new Set(ds.enrollments.filter((e) => e.classId === classId).map((e) => e.studentId));
    return ds.students.filter((s) => enrolled.has(s.id));
  }

  async getOrCreateSession(classId: string, subjectId: string, date: string): Promise<ClassSession> {
    const user = await this.requireUser();
    const existing = await this.db
      .from("class_sessions")
      .select("*")
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .eq("date", date)
      .eq("teacher_id", user.teacherId!)
      .maybeSingle();
    let row = existing.data;
    if (!row) {
      const ins = await this.db
        .from("class_sessions")
        .insert({ class_id: classId, subject_id: subjectId, teacher_id: user.teacherId, date, status: "completed" })
        .select("*")
        .single();
      if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "You are not assigned to this class/subject");
      row = ins.data;
    }
    return { id: row.id, classId: row.class_id, subjectId: row.subject_id, teacherId: row.teacher_id, date: row.date, status: row.status };
  }

  async getSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
    const { data } = await this.db.from("attendance_records").select("*").eq("session_id", sessionId);
    return (data ?? []).map((r) => ({ id: r.id, sessionId: r.session_id, studentId: r.student_id, status: r.status, markedAt: r.marked_at, markedBy: r.marked_by }));
  }

  async saveAttendance(sessionId: string, entries: AttendanceEntry[], reason?: string): Promise<void> {
    const user = await this.requireUser();
    const existing = await this.getSessionAttendance(sessionId);
    const byStudent = new Map(existing.map((r) => [r.studentId, r]));
    const toInsert: Record<string, unknown>[] = [];

    for (const entry of entries) {
      const prior = byStudent.get(entry.studentId);
      if (prior) {
        if (prior.status !== entry.status) {
          const upd = await this.db
            .from("attendance_records")
            .update({ status: entry.status, marked_at: new Date().toISOString(), marked_by: user.teacherId })
            .eq("id", prior.id);
          if (upd.error) throw new Error(upd.error.message);
          await this.audit("edit", "attendance_record", prior.id, { status: prior.status }, { status: entry.status }, reason ?? "Correction");
        }
      } else {
        toInsert.push({ session_id: sessionId, student_id: entry.studentId, status: entry.status, marked_by: user.teacherId, marked_at: new Date().toISOString() });
      }
    }
    if (toInsert.length > 0) {
      const ins = await this.db.from("attendance_records").insert(toInsert);
      if (ins.error) throw new Error(ins.error.message);
      await this.audit("create", "attendance_record", sessionId, null, { count: toInsert.length }, reason ?? null);
    }
  }

  // ---- Student -----------------------------------------------------------

  async getStudentDashboard(): Promise<StudentOverview> {
    const user = await this.requireUser();
    const ds = await this.loadDataset();
    return studentOverview(ds, user.studentId!, THRESHOLD, today());
  }

  // ---- Analytics & reports ----------------------------------------------

  async getAnalytics(_filters: ReportFilters): Promise<AnalyticsPayload> {
    void _filters;
    const ds = await this.loadDataset();
    return {
      subjectRates: subjectRates(ds),
      classRates: classRates(ds),
      trends30: attendanceTrends(ds, 30, today()),
      atRisk: studentsBelowThreshold(ds, THRESHOLD),
      threshold: THRESHOLD,
    };
  }

  async getReport(filters: ReportFilters): Promise<ReportRow[]> {
    const ds = await this.loadDataset();
    return reportRows(ds, filters);
  }

  // ---- internal ----------------------------------------------------------

  private async audit(action: string, entity: string, entityId: string, before: unknown, after: unknown, reason: string | null) {
    const user = await this.currentUser();
    if (!user) return;
    await this.db.from("audit_logs").insert({
      actor_id: user.profile.id,
      actor_name: user.profile.fullName,
      action,
      entity,
      entity_id: entityId,
      before: before ?? null,
      after: after ?? null,
      reason,
    });
  }
}
