import { generateDataset, DEMO_ACCOUNT_REFS, SEED_TODAY, type Dataset } from "@shared/seed.js";
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
} from "@shared/selectors.js";
import type {
  AttendanceRecord,
  AuditLog,
  Class,
  ClassSession,
  Paginated,
  SessionUser,
  Student,
  Subject,
  Teacher,
  TeacherAssignment,
  Role,
} from "@shared/types.js";
import type {
  AdminDashboard,
  AnalyticsPayload,
  AttendanceEntry,
  CreateStudentInput,
  DemoAccount,
  Repository,
  StudentListQuery,
} from "./types.js";
import type { ReportFilters, ReportRow, StudentOverview, TeacherOverview } from "@shared/selectors.js";

const DATA_KEY = "attendx:data";
const AUDIT_KEY = "attendx:audit";
const SESSION_KEY = "attendx:session";
const THRESHOLD = Number(import.meta.env.VITE_ATTENDANCE_THRESHOLD ?? 75);

interface StoredState {
  data: Dataset;
  audit: AuditLog[];
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    const auditRaw = localStorage.getItem(AUDIT_KEY);
    if (raw) {
      return { data: JSON.parse(raw) as Dataset, audit: auditRaw ? (JSON.parse(auditRaw) as AuditLog[]) : [] };
    }
  } catch {
    /* fall through to regenerate */
  }
  const data = generateDataset();
  const audit: AuditLog[] = [];
  persist(data, audit);
  return { data, audit };
}

function persist(data: Dataset, audit: AuditLog[]) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  localStorage.setItem(AUDIT_KEY, JSON.stringify(audit));
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Local mock repository. Mirrors the cloud API contract but runs entirely in
 * the browser against seed data persisted in localStorage. Authorization is
 * enforced here for a realistic demo — but, as the UI makes clear, nothing is
 * saved to a real cloud database in this mode.
 */
export class DemoRepository implements Repository {
  readonly mode = "demo" as const;
  private state: StoredState;

  constructor() {
    this.state = loadState();
  }

  private get data() {
    return this.state.data;
  }

  private save() {
    persist(this.state.data, this.state.audit);
  }

  // ---- Auth --------------------------------------------------------------

  private requireUser(): SessionUser {
    const profileId = localStorage.getItem(SESSION_KEY);
    const profile = this.data.profiles.find((p) => p.id === profileId);
    if (!profile) throw new Error("Not authenticated");
    const studentId = this.data.students.find((s) => s.profileId === profile.id)?.id;
    const teacherId = this.data.teachers.find((t) => t.profileId === profile.id)?.id;
    return { profile, studentId, teacherId };
  }

  private requireRole(...roles: Role[]): SessionUser {
    const user = this.requireUser();
    if (!roles.includes(user.profile.role)) {
      throw new Error("You do not have permission to perform this action");
    }
    return user;
  }

  async listDemoAccounts(): Promise<DemoAccount[]> {
    return DEMO_ACCOUNT_REFS.map((ref) => {
      const profile = this.data.profiles.find((p) => p.id === ref.profileId)!;
      return { ...ref, name: profile.fullName, email: profile.email };
    });
  }

  async loginDemo(profileId: string): Promise<SessionUser> {
    const profile = this.data.profiles.find((p) => p.id === profileId);
    if (!profile) throw new Error("Unknown demo account");
    localStorage.setItem(SESSION_KEY, profile.id);
    return this.requireUser();
  }

  async loginWithPassword(): Promise<SessionUser> {
    throw new Error("Password login is only available in cloud mode. Use the demo account selector.");
  }

  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
  }

  async currentUser(): Promise<SessionUser | null> {
    try {
      return this.requireUser();
    } catch {
      return null;
    }
  }

  // ---- Admin -------------------------------------------------------------

  async getAdminDashboard(): Promise<AdminDashboard> {
    this.requireRole("admin");
    return {
      stats: adminStats(this.data, THRESHOLD),
      trends7: attendanceTrends(this.data, 7, SEED_TODAY),
      trends30: attendanceTrends(this.data, 30, SEED_TODAY),
      subjectRates: subjectRates(this.data),
      classRates: classRates(this.data),
      recent: recentActivity(this.data, 8),
    };
  }

  async listStudents(q: StudentListQuery): Promise<Paginated<Student>> {
    this.requireRole("admin");
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 10;
    let items = this.data.students;
    if (q.classId) items = items.filter((s) => s.classId === q.classId);
    if (q.search) {
      const t = q.search.toLowerCase();
      items = items.filter(
        (s) => s.fullName.toLowerCase().includes(t) || s.rollNo.toLowerCase().includes(t) || s.email.toLowerCase().includes(t),
      );
    }
    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total, page, pageSize };
  }

  async createStudent(input: CreateStudentInput): Promise<Student> {
    const user = this.requireRole("admin");
    if (this.data.students.some((s) => s.rollNo === input.rollNo)) {
      throw new Error(`Roll number ${input.rollNo} already exists`);
    }
    const profileId = uid("prof-stu");
    const studentId = uid("stu");
    this.data.profiles.push({
      id: profileId,
      email: input.email,
      fullName: input.fullName,
      role: "student",
      active: true,
      createdAt: new Date().toISOString(),
    });
    const student: Student = {
      id: studentId,
      profileId,
      rollNo: input.rollNo,
      classId: input.classId,
      fullName: input.fullName,
      email: input.email,
      active: true,
    };
    this.data.students.push(student);
    this.data.enrollments.push({ id: uid("enr"), classId: input.classId, studentId });
    this.audit(user, "create", "student", studentId, null, student, null);
    this.save();
    return student;
  }

  async setStudentActive(id: string, active: boolean): Promise<Student> {
    const user = this.requireRole("admin");
    const student = this.data.students.find((s) => s.id === id);
    if (!student) throw new Error("Student not found");
    const before = { active: student.active };
    student.active = active;
    const profile = this.data.profiles.find((p) => p.id === student.profileId);
    if (profile) profile.active = active;
    this.audit(user, active ? "activate" : "deactivate", "student", id, before, { active }, null);
    this.save();
    return student;
  }

  async listTeachers(): Promise<Teacher[]> {
    this.requireRole("admin");
    return [...this.data.teachers];
  }

  async createTeacher(input: { fullName: string; email: string; department: string }): Promise<Teacher> {
    const user = this.requireRole("admin");
    const profileId = uid("prof-tch");
    const teacherId = uid("tch");
    this.data.profiles.push({
      id: profileId,
      email: input.email,
      fullName: input.fullName,
      role: "teacher",
      active: true,
      createdAt: new Date().toISOString(),
    });
    const teacher: Teacher = { id: teacherId, profileId, department: input.department, fullName: input.fullName, email: input.email, active: true };
    this.data.teachers.push(teacher);
    this.audit(user, "create", "teacher", teacherId, null, teacher, null);
    this.save();
    return teacher;
  }

  async listClasses(): Promise<Class[]> {
    await this.requireAnyAuthed();
    return [...this.data.classes];
  }

  async createClass(input: { name: string; section: string; academicYear: string }): Promise<Class> {
    const user = this.requireRole("admin");
    const cls: Class = { id: uid("cls"), ...input };
    this.data.classes.push(cls);
    this.audit(user, "create", "class", cls.id, null, cls, null);
    this.save();
    return cls;
  }

  async listSubjects(): Promise<Subject[]> {
    await this.requireAnyAuthed();
    return [...this.data.subjects];
  }

  async createSubject(input: { code: string; name: string }): Promise<Subject> {
    const user = this.requireRole("admin");
    if (this.data.subjects.some((s) => s.code === input.code)) {
      throw new Error(`Subject code ${input.code} already exists`);
    }
    const subject: Subject = { id: uid("sub"), ...input };
    this.data.subjects.push(subject);
    this.audit(user, "create", "subject", subject.id, null, subject, null);
    this.save();
    return subject;
  }

  async listAssignments(): Promise<TeacherAssignment[]> {
    this.requireRole("admin");
    return [...this.data.assignments];
  }

  async listAuditLogs(page = 1, pageSize = 20): Promise<Paginated<AuditLog>> {
    this.requireRole("admin");
    const sorted = [...this.state.audit].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const start = (page - 1) * pageSize;
    return { items: sorted.slice(start, start + pageSize), total: sorted.length, page, pageSize };
  }

  // ---- Teacher -----------------------------------------------------------

  async getTeacherDashboard(): Promise<TeacherOverview> {
    const user = this.requireRole("teacher");
    return teacherOverview(this.data, user.teacherId!, SEED_TODAY);
  }

  async getRoster(classId: string): Promise<Student[]> {
    const user = this.requireRole("teacher", "admin");
    if (user.profile.role === "teacher") {
      const allowed = this.data.assignments.some((a) => a.teacherId === user.teacherId && a.classId === classId);
      if (!allowed) throw new Error("You are not assigned to this class");
    }
    const enrolledIds = new Set(this.data.enrollments.filter((e) => e.classId === classId).map((e) => e.studentId));
    return this.data.students.filter((s) => enrolledIds.has(s.id));
  }

  async getOrCreateSession(classId: string, subjectId: string, date: string): Promise<ClassSession> {
    const user = this.requireRole("teacher");
    const allowed = this.data.assignments.some(
      (a) => a.teacherId === user.teacherId && a.classId === classId && a.subjectId === subjectId,
    );
    if (!allowed) throw new Error("You are not assigned to this class/subject");

    let session = this.data.sessions.find(
      (s) => s.classId === classId && s.subjectId === subjectId && s.date === date && s.teacherId === user.teacherId,
    );
    if (!session) {
      session = { id: uid("ses"), classId, subjectId, teacherId: user.teacherId!, date, status: "completed" };
      this.data.sessions.push(session);
      this.audit(user, "create", "class_session", session.id, null, session, null);
      this.save();
    }
    return session;
  }

  async getSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
    const user = this.requireRole("teacher", "admin");
    const session = this.data.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error("Session not found");
    if (user.profile.role === "teacher" && session.teacherId !== user.teacherId) {
      throw new Error("You can only view your own sessions");
    }
    return this.data.attendance.filter((r) => r.sessionId === sessionId);
  }

  async saveAttendance(sessionId: string, entries: AttendanceEntry[], reason?: string): Promise<void> {
    const user = this.requireRole("teacher");
    const session = this.data.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error("Session not found");
    if (session.teacherId !== user.teacherId) throw new Error("You can only mark your own sessions");
    if (session.status === "cancelled") throw new Error("Cannot mark a cancelled session");

    const rosterIds = new Set(this.data.enrollments.filter((e) => e.classId === session.classId).map((e) => e.studentId));

    for (const entry of entries) {
      if (!rosterIds.has(entry.studentId)) {
        throw new Error("Student is not enrolled in this class");
      }
      const existing = this.data.attendance.find((r) => r.sessionId === sessionId && r.studentId === entry.studentId);
      if (existing) {
        if (existing.status !== entry.status) {
          const before = { status: existing.status };
          existing.status = entry.status;
          existing.markedAt = new Date().toISOString();
          existing.markedBy = user.teacherId!;
          this.audit(user, "edit", "attendance_record", existing.id, before, { status: entry.status }, reason ?? "Correction");
        }
      } else {
        const record: AttendanceRecord = {
          id: uid("att"),
          sessionId,
          studentId: entry.studentId,
          status: entry.status,
          markedAt: new Date().toISOString(),
          markedBy: user.teacherId!,
        };
        this.data.attendance.push(record);
        this.audit(user, "create", "attendance_record", record.id, null, record, reason ?? null);
      }
    }
    this.save();
  }

  // ---- Student -----------------------------------------------------------

  async getStudentDashboard(): Promise<StudentOverview> {
    const user = this.requireRole("student");
    return studentOverview(this.data, user.studentId!, THRESHOLD, SEED_TODAY);
  }

  // ---- Analytics & reports ----------------------------------------------

  async getAnalytics(filters: ReportFilters): Promise<AnalyticsPayload> {
    const user = this.requireRole("admin", "teacher");
    let ds = this.data;
    if (user.profile.role === "teacher") {
      ds = this.scopeToTeacher(user.teacherId!);
    }
    void filters;
    return {
      subjectRates: subjectRates(ds),
      classRates: classRates(ds),
      trends30: attendanceTrends(ds, 30, SEED_TODAY),
      atRisk: studentsBelowThreshold(ds, THRESHOLD),
      threshold: THRESHOLD,
    };
  }

  async getReport(filters: ReportFilters): Promise<ReportRow[]> {
    const user = this.requireRole("admin", "teacher");
    let ds = this.data;
    if (user.profile.role === "teacher") ds = this.scopeToTeacher(user.teacherId!);
    return reportRows(ds, filters);
  }

  async resetDemoData(): Promise<void> {
    const data = generateDataset();
    this.state = { data, audit: [] };
    this.save();
  }

  // ---- Internal helpers --------------------------------------------------

  private async requireAnyAuthed(): Promise<SessionUser> {
    return this.requireUser();
  }

  /** Restrict the dataset to a teacher's own sessions/attendance (defense in depth). */
  private scopeToTeacher(teacherId: string): Dataset {
    const sessions = this.data.sessions.filter((s) => s.teacherId === teacherId);
    const sessionIds = new Set(sessions.map((s) => s.id));
    const attendance = this.data.attendance.filter((r) => sessionIds.has(r.sessionId));
    return { ...this.data, sessions, attendance };
  }

  private audit(
    user: SessionUser,
    action: string,
    entity: string,
    entityId: string,
    before: unknown,
    after: unknown,
    reason: string | null,
  ) {
    this.state.audit.push({
      id: uid("aud"),
      actorId: user.profile.id,
      actorName: user.profile.fullName,
      action,
      entity,
      entityId,
      before,
      after,
      reason,
      timestamp: new Date().toISOString(),
    });
  }
}
