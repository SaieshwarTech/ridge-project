import type { Dataset } from "@shared/seed.js";
import type {
  AttendanceRecord,
  Class,
  ClassEnrollment,
  ClassSession,
  Profile,
  Student,
  Subject,
  Teacher,
  TeacherAssignment,
} from "@shared/types.js";
import { getAdminClient } from "./supabase.js";

/**
 * Load the full institution dataset from Supabase and map snake_case rows to
 * the camelCase domain shape that the shared selectors operate on. Scale here
 * is academic (dozens-to-hundreds of rows); selectors run in-process.
 */
export async function loadDataset(): Promise<Dataset> {
  const db = getAdminClient();
  const [
    { data: profiles },
    { data: students },
    { data: teachers },
    { data: classes },
    { data: subjects },
    { data: enrollments },
    { data: assignments },
    { data: sessions },
    { data: attendance },
  ] = await Promise.all([
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

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const mappedProfiles: Profile[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    role: p.role,
    active: p.active,
    createdAt: p.created_at,
  }));

  const mappedStudents: Student[] = (students ?? []).map((s) => {
    const prof = profileById.get(s.profile_id);
    return {
      id: s.id,
      profileId: s.profile_id,
      rollNo: s.roll_no,
      classId: s.class_id,
      fullName: prof?.full_name ?? "",
      email: prof?.email ?? "",
      active: s.active,
    };
  });

  const mappedTeachers: Teacher[] = (teachers ?? []).map((t) => {
    const prof = profileById.get(t.profile_id);
    return {
      id: t.id,
      profileId: t.profile_id,
      department: t.department,
      fullName: prof?.full_name ?? "",
      email: prof?.email ?? "",
      active: t.active,
    };
  });

  const mappedClasses: Class[] = (classes ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    section: c.section,
    academicYear: c.academic_year,
  }));

  const mappedSubjects: Subject[] = (subjects ?? []).map((s) => ({ id: s.id, code: s.code, name: s.name }));

  const mappedEnrollments: ClassEnrollment[] = (enrollments ?? []).map((e) => ({
    id: e.id,
    classId: e.class_id,
    studentId: e.student_id,
  }));

  const mappedAssignments: TeacherAssignment[] = (assignments ?? []).map((a) => ({
    id: a.id,
    teacherId: a.teacher_id,
    classId: a.class_id,
    subjectId: a.subject_id,
  }));

  const mappedSessions: ClassSession[] = (sessions ?? []).map((s) => ({
    id: s.id,
    classId: s.class_id,
    subjectId: s.subject_id,
    teacherId: s.teacher_id,
    date: s.date,
    status: s.status,
  }));

  const mappedAttendance: AttendanceRecord[] = (attendance ?? []).map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    studentId: r.student_id,
    status: r.status,
    markedAt: r.marked_at,
    markedBy: r.marked_by,
  }));

  return {
    profiles: mappedProfiles,
    students: mappedStudents,
    teachers: mappedTeachers,
    classes: mappedClasses,
    subjects: mappedSubjects,
    enrollments: mappedEnrollments,
    assignments: mappedAssignments,
    sessions: mappedSessions,
    attendance: mappedAttendance,
  };
}

/** Restrict a dataset to a single teacher's sessions (defense in depth). */
export function scopeToTeacher(ds: Dataset, teacherId: string): Dataset {
  const sessions = ds.sessions.filter((s) => s.teacherId === teacherId);
  const ids = new Set(sessions.map((s) => s.id));
  return { ...ds, sessions, attendance: ds.attendance.filter((r) => ids.has(r.sessionId)) };
}
