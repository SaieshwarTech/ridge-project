/**
 * Seed a real Supabase project with the same fictional "Coastal Institute of
 * Technology" dataset used by demo mode. Reuses shared/seed.ts so the cloud DB
 * and the browser demo describe the identical institution.
 *
 * Usage (after running the SQL migrations and setting server env vars):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx vite-node scripts/seed-supabase.ts
 *
 * All demo users are created with the shared password below (demo only — never
 * use in production). Re-running is not idempotent; reset the DB first.
 */
import { createClient } from "@supabase/supabase-js";
import { generateDataset } from "../shared/seed.js";

const DEMO_PASSWORD = "AttendX!demo123";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const ds = generateDataset();
  const profileId = new Map<string, string>(); // seed id -> auth uuid
  const classId = new Map<string, string>();
  const subjectId = new Map<string, string>();
  const studentId = new Map<string, string>();
  const teacherId = new Map<string, string>();

  console.log("Creating auth users + profiles…");
  for (const p of ds.profiles) {
    const created = await db.auth.admin.createUser({
      email: p.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: p.fullName, role: p.role },
    });
    if (created.error || !created.data.user) throw new Error(`auth user ${p.email}: ${created.error?.message}`);
    const uid = created.data.user.id;
    profileId.set(p.id, uid);
    const { error } = await db.from("profiles").insert({ id: uid, email: p.email, full_name: p.fullName, role: p.role, active: p.active });
    if (error) throw new Error(`profile ${p.email}: ${error.message}`);
  }

  console.log("Classes + subjects…");
  for (const c of ds.classes) {
    const { data, error } = await db.from("classes").insert({ name: c.name, section: c.section, academic_year: c.academicYear }).select("id").single();
    if (error || !data) throw error;
    classId.set(c.id, data.id);
  }
  for (const s of ds.subjects) {
    const { data, error } = await db.from("subjects").insert({ code: s.code, name: s.name }).select("id").single();
    if (error || !data) throw error;
    subjectId.set(s.id, data.id);
  }

  console.log("Students + teachers…");
  for (const t of ds.teachers) {
    const { data, error } = await db.from("teachers").insert({ profile_id: profileId.get(t.profileId), department: t.department, active: t.active }).select("id").single();
    if (error || !data) throw error;
    teacherId.set(t.id, data.id);
  }
  for (const s of ds.students) {
    const { data, error } = await db.from("students").insert({ profile_id: profileId.get(s.profileId), roll_no: s.rollNo, class_id: classId.get(s.classId), active: s.active }).select("id").single();
    if (error || !data) throw error;
    studentId.set(s.id, data.id);
  }

  console.log("Enrollments, assignments, sessions…");
  await db.from("class_enrollments").insert(ds.enrollments.map((e) => ({ class_id: classId.get(e.classId), student_id: studentId.get(e.studentId) })));
  await db.from("teacher_assignments").insert(ds.assignments.map((a) => ({ teacher_id: teacherId.get(a.teacherId), class_id: classId.get(a.classId), subject_id: subjectId.get(a.subjectId) })));

  const sessionId = new Map<string, string>();
  for (const s of ds.sessions) {
    const { data, error } = await db.from("class_sessions").insert({ class_id: classId.get(s.classId), subject_id: subjectId.get(s.subjectId), teacher_id: teacherId.get(s.teacherId), date: s.date, status: s.status }).select("id").single();
    if (error || !data) throw error;
    sessionId.set(s.id, data.id);
  }

  console.log(`Attendance (${ds.attendance.length} rows)…`);
  const rows = ds.attendance.map((r) => ({
    session_id: sessionId.get(r.sessionId),
    student_id: studentId.get(r.studentId),
    status: r.status,
    marked_by: teacherId.get(r.markedBy),
    marked_at: r.markedAt,
  }));
  // chunked insert
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from("attendance_records").insert(rows.slice(i, i + 200));
    if (error) throw error;
  }

  console.log("Done. Demo password for all users:", DEMO_PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
