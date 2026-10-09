import type {
  AuditLog,
  Class,
  ClassSession,
  Paginated,
  SessionUser,
  Student,
  Subject,
  Teacher,
  TeacherAssignment,
  AttendanceRecord,
  AttendanceStatus,
} from "@shared/types.js";
import type {
  ActivityItem,
  AtRiskRow,
  ReportFilters,
  ReportRow,
  StudentOverview,
  TeacherOverview,
} from "@shared/selectors.js";
import type { DashboardStats, NamedRate, TrendPoint } from "@shared/types.js";

export interface DemoAccount {
  label: string;
  profileId: string;
  role: "admin" | "teacher" | "student";
  name: string;
  email: string;
}

export interface AdminDashboard {
  stats: DashboardStats;
  trends7: TrendPoint[];
  trends30: TrendPoint[];
  subjectRates: NamedRate[];
  classRates: NamedRate[];
  recent: ActivityItem[];
}

export interface AnalyticsPayload {
  subjectRates: NamedRate[];
  classRates: NamedRate[];
  trends30: TrendPoint[];
  atRisk: AtRiskRow[];
  threshold: number;
}

export interface StudentListQuery {
  search?: string;
  classId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateStudentInput {
  fullName: string;
  email: string;
  rollNo: string;
  classId: string;
}

export interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
}

export interface Repository {
  readonly mode: "demo" | "cloud";

  // ---- Auth --------------------------------------------------------------
  listDemoAccounts(): Promise<DemoAccount[]>;
  loginDemo(profileId: string): Promise<SessionUser>;
  loginWithPassword(email: string, password: string): Promise<SessionUser>;
  logout(): Promise<void>;
  currentUser(): Promise<SessionUser | null>;

  // ---- Admin -------------------------------------------------------------
  getAdminDashboard(): Promise<AdminDashboard>;
  listStudents(q: StudentListQuery): Promise<Paginated<Student>>;
  createStudent(input: CreateStudentInput): Promise<Student>;
  setStudentActive(id: string, active: boolean): Promise<Student>;
  listTeachers(): Promise<Teacher[]>;
  createTeacher(input: { fullName: string; email: string; department: string }): Promise<Teacher>;
  listClasses(): Promise<Class[]>;
  createClass(input: { name: string; section: string; academicYear: string }): Promise<Class>;
  listSubjects(): Promise<Subject[]>;
  createSubject(input: { code: string; name: string }): Promise<Subject>;
  listAssignments(): Promise<TeacherAssignment[]>;
  listAuditLogs(page?: number, pageSize?: number): Promise<Paginated<AuditLog>>;

  // ---- Teacher -----------------------------------------------------------
  getTeacherDashboard(): Promise<TeacherOverview>;
  getRoster(classId: string): Promise<Student[]>;
  getOrCreateSession(classId: string, subjectId: string, date: string): Promise<ClassSession>;
  getSessionAttendance(sessionId: string): Promise<AttendanceRecord[]>;
  saveAttendance(sessionId: string, entries: AttendanceEntry[], reason?: string): Promise<void>;

  // ---- Student -----------------------------------------------------------
  getStudentDashboard(): Promise<StudentOverview>;

  // ---- Analytics & reports (admin + teacher scoped) ----------------------
  getAnalytics(filters: ReportFilters): Promise<AnalyticsPayload>;
  getReport(filters: ReportFilters): Promise<ReportRow[]>;

  // ---- Demo-only ---------------------------------------------------------
  resetDemoData?(): Promise<void>;
}
