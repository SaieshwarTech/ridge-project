// ============================================================================
// Shared domain types — used by the frontend, the demo repo, and the API.
// ============================================================================

export type Role = "admin" | "teacher" | "student";

export type SessionStatus = "scheduled" | "completed" | "cancelled";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Student {
  id: string;
  profileId: string;
  rollNo: string;
  classId: string;
  // denormalised for convenience in the UI / demo repo
  fullName: string;
  email: string;
  active: boolean;
}

export interface Teacher {
  id: string;
  profileId: string;
  department: string;
  fullName: string;
  email: string;
  active: boolean;
}

export interface Class {
  id: string;
  name: string;
  section: string;
  academicYear: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
}

export interface ClassEnrollment {
  id: string;
  classId: string;
  studentId: string;
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
}

export interface ClassSession {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  date: string; // ISO date (YYYY-MM-DD)
  status: SessionStatus;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  markedAt: string;
  markedBy: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  timestamp: string;
}

// ---- Derived / view models -------------------------------------------------

export interface SubjectAttendance {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  eligible: number; // denominator
  percentage: number;
  needed: number | null; // sessions needed to reach threshold, null if unreachable/not applicable
  reachable: boolean;
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  overallAttendanceRate: number;
  studentsBelowThreshold: number;
  threshold: number;
}

export interface TrendPoint {
  date: string;
  rate: number;
  present: number;
  eligible: number;
}

export interface NamedRate {
  id: string;
  name: string;
  rate: number;
  present: number;
  eligible: number;
}

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; code?: string };
export type ApiResult<T> = ApiOk<T> | ApiErr;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SessionUser {
  profile: Profile;
  // role-scoped ids
  studentId?: string;
  teacherId?: string;
}
