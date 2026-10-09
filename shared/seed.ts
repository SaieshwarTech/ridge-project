// ============================================================================
// Deterministic seed data for the fictional "Coastal Institute of Technology".
// Used by the demo repository and to generate the SQL seed (scripts/gen-sql-seed.ts),
// so the browser demo and a real Supabase database describe the same institution.
//
// No real personal information is used.
// ============================================================================

import type {
  AttendanceRecord,
  AttendanceStatus,
  Class,
  ClassEnrollment,
  ClassSession,
  Profile,
  SessionStatus,
  Student,
  Subject,
  Teacher,
  TeacherAssignment,
} from "./types.js";

export interface Dataset {
  profiles: Profile[];
  students: Student[];
  teachers: Teacher[];
  classes: Class[];
  subjects: Subject[];
  enrollments: ClassEnrollment[];
  assignments: TeacherAssignment[];
  sessions: ClassSession[];
  attendance: AttendanceRecord[];
}

// Reference "today" for the seeded institution so demo data is stable.
export const SEED_TODAY = "2026-10-09";

// Deterministic PRNG (mulberry32) so the dataset is identical on every run.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260409);

const FIRST = [
  "Aarav", "Diya", "Kabir", "Isha", "Vivaan", "Anaya", "Reyansh", "Myra",
  "Arjun", "Sara", "Ayaan", "Kiara", "Aditya", "Riya", "Krishna", "Zara",
  "Ishaan", "Navya", "Rohan", "Aisha", "Dev", "Tara", "Veer", "Nisha",
  "Yash", "Mira", "Om", "Pari", "Rudra", "Siya",
];
const LAST = [
  "Nair", "Menon", "Rao", "Shetty", "Pillai", "Kamath", "Bhat", "Hegde",
  "Fernandes", "DSouza", "Pai", "Prabhu", "Shenoy", "Kini", "Acharya", "Naik",
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function generateDataset(): Dataset {
  const profiles: Profile[] = [];
  const students: Student[] = [];
  const teachers: Teacher[] = [];
  const enrollments: ClassEnrollment[] = [];
  const assignments: TeacherAssignment[] = [];
  const sessions: ClassSession[] = [];
  const attendance: AttendanceRecord[] = [];

  const createdAt = "2026-08-01T09:00:00Z";

  // ---- Classes (3) ---------------------------------------------------------
  const classes: Class[] = [
    { id: "cls-ty", name: "TY B.Sc IT", section: "A", academicYear: "2026-27" },
    { id: "cls-sy", name: "SY B.Sc IT", section: "A", academicYear: "2026-27" },
    { id: "cls-fy", name: "FY B.Sc IT", section: "A", academicYear: "2026-27" },
  ];

  // ---- Subjects (5) --------------------------------------------------------
  const subjects: Subject[] = [
    { id: "sub-ds", code: "CS301", name: "Data Structures" },
    { id: "sub-db", code: "CS302", name: "Database Systems" },
    { id: "sub-os", code: "CS303", name: "Operating Systems" },
    { id: "sub-cn", code: "CS304", name: "Computer Networks" },
    { id: "sub-se", code: "CS305", name: "Software Engineering" },
  ];

  // ---- Admin ---------------------------------------------------------------
  profiles.push({
    id: "prof-admin",
    email: "admin@coastal.edu",
    fullName: "Priya Deshpande",
    role: "admin",
    active: true,
    createdAt,
  });

  // ---- Teachers (4) --------------------------------------------------------
  const teacherSeed = [
    { id: "tch-1", name: "Dr. Suresh Kamath", dept: "Computer Science" },
    { id: "tch-2", name: "Dr. Latha Pai", dept: "Computer Science" },
    { id: "tch-3", name: "Prof. Anil Shenoy", dept: "Information Technology" },
    { id: "tch-4", name: "Prof. Meera Rao", dept: "Information Technology" },
  ];
  teacherSeed.forEach((t, i) => {
    const profileId = `prof-${t.id}`;
    const email = `teacher${i + 1}@coastal.edu`;
    profiles.push({ id: profileId, email, fullName: t.name, role: "teacher", active: true, createdAt });
    teachers.push({ id: t.id, profileId, department: t.dept, fullName: t.name, email, active: true });
  });

  // ---- Students (30, 10 per class) ----------------------------------------
  let rollCounter = 1;
  // Students flagged as "struggling" will trend below the 75% threshold.
  const strugglingIdx = new Set([3, 7, 12, 18, 24, 27]);
  classes.forEach((cls, ci) => {
    for (let i = 0; i < 10; i++) {
      const idx = ci * 10 + i;
      const first = FIRST[idx % FIRST.length];
      const last = LAST[(idx * 3 + 1) % LAST.length];
      const name = `${first} ${last}`;
      const roll = `CIT${2026}${String(rollCounter).padStart(3, "0")}`;
      const email = `${first.toLowerCase()}.${last.toLowerCase()}${rollCounter}@student.coastal.edu`;
      const profileId = `prof-stu-${idx}`;
      const studentId = `stu-${idx}`;
      profiles.push({ id: profileId, email, fullName: name, role: "student", active: true, createdAt });
      students.push({ id: studentId, profileId, rollNo: roll, classId: cls.id, fullName: name, email, active: true });
      enrollments.push({ id: `enr-${idx}`, classId: cls.id, studentId });
      rollCounter++;
    }
  });

  // ---- Teacher assignments: each class studies 4 of the 5 subjects ---------
  const classSubjects: Record<string, string[]> = {
    "cls-ty": ["sub-ds", "sub-db", "sub-os", "sub-cn"],
    "cls-sy": ["sub-ds", "sub-db", "sub-se", "sub-cn"],
    "cls-fy": ["sub-ds", "sub-os", "sub-se", "sub-db"],
  };
  let assignCounter = 0;
  const comboTeacher = new Map<string, string>(); // `${classId}:${subjectId}` -> teacherId
  Object.entries(classSubjects).forEach(([classId, subs]) => {
    subs.forEach((subjectId) => {
      const teacher = teacherSeed[assignCounter % teacherSeed.length];
      assignments.push({ id: `asg-${assignCounter}`, teacherId: teacher.id, classId, subjectId });
      comboTeacher.set(`${classId}:${subjectId}`, teacher.id);
      assignCounter++;
    });
  });

  // ---- Class sessions ------------------------------------------------------
  // Sessions on Mon/Wed/Fri over several weeks starting 2026-09-07.
  const start = new Date("2026-09-07T00:00:00Z");
  const today = new Date(`${SEED_TODAY}T00:00:00Z`);
  let sessionCounter = 0;

  Object.entries(classSubjects).forEach(([classId, subs]) => {
    subs.forEach((subjectId, si) => {
      const teacherId = comboTeacher.get(`${classId}:${subjectId}`)!;
      // 4 sessions each: spread weekly, offset per subject to vary dates.
      for (let w = 0; w < 4; w++) {
        const d = new Date(start);
        d.setUTCDate(start.getUTCDate() + w * 7 + si); // weekly, staggered by subject
        let status: SessionStatus = d < today ? "completed" : "scheduled";
        // Make a small, deterministic fraction of past sessions cancelled.
        if (status === "completed" && rand() < 0.08) status = "cancelled";
        sessions.push({
          id: `ses-${sessionCounter}`,
          classId,
          subjectId,
          teacherId,
          date: isoDate(d),
          status,
        });
        sessionCounter++;
      }
    });
  });

  // ---- Attendance records --------------------------------------------------
  // Each student has a baseline reliability; struggling students trend low.
  const reliability = new Map<string, number>();
  students.forEach((s, i) => {
    const base = strugglingIdx.has(i) ? 0.5 + rand() * 0.15 : 0.82 + rand() * 0.15;
    reliability.set(s.id, Math.min(0.98, base));
  });

  const enrolledByClass = new Map<string, Student[]>();
  classes.forEach((cls) => {
    enrolledByClass.set(cls.id, students.filter((s) => s.classId === cls.id));
  });

  let recCounter = 0;
  for (const session of sessions) {
    if (session.status !== "completed") continue; // only completed sessions get marked
    const roster = enrolledByClass.get(session.classId) ?? [];
    for (const student of roster) {
      const r = reliability.get(student.id)!;
      const roll = rand();
      let status: AttendanceStatus;
      if (roll < r) status = "present";
      else if (roll < r + 0.1) status = "late";
      else if (roll < r + 0.14) status = "excused";
      else status = "absent";
      attendance.push({
        id: `att-${recCounter}`,
        sessionId: session.id,
        studentId: student.id,
        status,
        markedAt: `${session.date}T10:15:00Z`,
        markedBy: session.teacherId,
      });
      recCounter++;
    }
  }

  return { profiles, students, teachers, classes, subjects, enrollments, assignments, sessions, attendance };
}

// Which demo accounts the login selector should offer. Each references a
// profile id in the generated dataset; names/emails are resolved at runtime.
export interface DemoAccountRef {
  label: string;
  profileId: string;
  role: "admin" | "teacher" | "student";
}

export const DEMO_ACCOUNT_REFS: DemoAccountRef[] = [
  { label: "Administrator", profileId: "prof-admin", role: "admin" },
  { label: "Teacher — Dr. Suresh Kamath", profileId: "prof-tch-1", role: "teacher" },
  { label: "Student — healthy attendance", profileId: "prof-stu-0", role: "student" },
  { label: "Student — at risk (below 75%)", profileId: "prof-stu-3", role: "student" },
];
