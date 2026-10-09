import { getSupabase } from "@/lib/supabaseClient.js";
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
} from "@shared/types.js";
import type { ReportFilters, ReportRow, StudentOverview, TeacherOverview } from "@shared/selectors.js";
import type {
  AdminDashboard,
  AnalyticsPayload,
  AttendanceEntry,
  CreateStudentInput,
  DemoAccount,
  Repository,
  StudentListQuery,
} from "./types.js";

/**
 * Cloud repository. Delegates every privileged read/write to the Vercel
 * serverless functions under /api. The browser only ever holds the user's
 * Supabase session token, which the API verifies and authorizes server-side.
 */
export class CloudRepository implements Repository {
  readonly mode = "cloud" as const;

  private async authHeader(): Promise<Record<string, string>> {
    const { data } = await getSupabase().auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(await this.authHeader()),
      ...(init?.headers as Record<string, string> | undefined),
    };
    const res = await fetch(`/api${path}`, { ...init, headers });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok || json.ok === false) {
      throw new Error(json.error ?? `Request failed (${res.status})`);
    }
    return json.data as T;
  }

  private qs(params: Record<string, string | number | undefined>): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
    const s = sp.toString();
    return s ? `?${s}` : "";
  }

  // ---- Auth --------------------------------------------------------------

  async listDemoAccounts(): Promise<DemoAccount[]> {
    return []; // cloud mode uses real credentials
  }

  async loginDemo(): Promise<SessionUser> {
    throw new Error("Demo login is not available in cloud mode. Sign in with your credentials.");
  }

  async loginWithPassword(email: string, password: string): Promise<SessionUser> {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const user = await this.currentUser();
    if (!user) throw new Error("Signed in, but no profile is linked to this account.");
    return user;
  }

  async logout(): Promise<void> {
    await getSupabase().auth.signOut();
  }

  async currentUser(): Promise<SessionUser | null> {
    const { data } = await getSupabase().auth.getSession();
    if (!data.session) return null;
    try {
      return await this.request<SessionUser>("/me");
    } catch {
      return null;
    }
  }

  // ---- Admin -------------------------------------------------------------

  getAdminDashboard(): Promise<AdminDashboard> {
    return this.request<AdminDashboard>("/dashboard/stats");
  }

  listStudents(q: StudentListQuery): Promise<Paginated<Student>> {
    return this.request<Paginated<Student>>(`/students${this.qs({ ...q })}`);
  }

  createStudent(input: CreateStudentInput): Promise<Student> {
    return this.request<Student>("/students", { method: "POST", body: JSON.stringify(input) });
  }

  setStudentActive(id: string, active: boolean): Promise<Student> {
    return this.request<Student>(`/students/${id}`, { method: "PATCH", body: JSON.stringify({ active }) });
  }

  listTeachers(): Promise<Teacher[]> {
    return this.request<Teacher[]>("/teachers");
  }

  createTeacher(input: { fullName: string; email: string; department: string }): Promise<Teacher> {
    return this.request<Teacher>("/teachers", { method: "POST", body: JSON.stringify(input) });
  }

  listClasses(): Promise<Class[]> {
    return this.request<Class[]>("/classes");
  }

  createClass(input: { name: string; section: string; academicYear: string }): Promise<Class> {
    return this.request<Class>("/classes", { method: "POST", body: JSON.stringify(input) });
  }

  listSubjects(): Promise<Subject[]> {
    return this.request<Subject[]>("/subjects");
  }

  createSubject(input: { code: string; name: string }): Promise<Subject> {
    return this.request<Subject>("/subjects", { method: "POST", body: JSON.stringify(input) });
  }

  listAssignments(): Promise<TeacherAssignment[]> {
    return this.request<TeacherAssignment[]>("/assignments");
  }

  listAuditLogs(page = 1, pageSize = 20): Promise<Paginated<AuditLog>> {
    return this.request<Paginated<AuditLog>>(`/audit-logs${this.qs({ page, pageSize })}`);
  }

  // ---- Teacher -----------------------------------------------------------

  getTeacherDashboard(): Promise<TeacherOverview> {
    return this.request<TeacherOverview>("/teacher/overview");
  }

  getRoster(classId: string): Promise<Student[]> {
    return this.request<Student[]>(`/roster${this.qs({ classId })}`);
  }

  getOrCreateSession(classId: string, subjectId: string, date: string): Promise<ClassSession> {
    return this.request<ClassSession>("/sessions", {
      method: "POST",
      body: JSON.stringify({ classId, subjectId, date }),
    });
  }

  getSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
    return this.request<AttendanceRecord[]>(`/attendance${this.qs({ sessionId })}`);
  }

  saveAttendance(sessionId: string, entries: AttendanceEntry[], reason?: string): Promise<void> {
    return this.request<void>("/attendance", {
      method: "POST",
      body: JSON.stringify({ sessionId, entries, reason }),
    });
  }

  // ---- Student -----------------------------------------------------------

  getStudentDashboard(): Promise<StudentOverview> {
    return this.request<StudentOverview>("/student/overview");
  }

  // ---- Analytics & reports ----------------------------------------------

  getAnalytics(filters: ReportFilters): Promise<AnalyticsPayload> {
    return this.request<AnalyticsPayload>(`/analytics${this.qs({ ...filters })}`);
  }

  getReport(filters: ReportFilters): Promise<ReportRow[]> {
    return this.request<ReportRow[]>(`/reports/attendance${this.qs({ ...filters })}`);
  }
}
