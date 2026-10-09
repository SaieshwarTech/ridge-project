import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authenticate, requireRole } from "../_lib/auth.js";
import { allowMethods, sendOk, withErrors, parseBody, parseQuery, enforceBodySize, HttpError } from "../_lib/http.js";
import { getAdminClient } from "../_lib/supabase.js";
import { loadDataset } from "../_lib/dataset.js";
import { writeAudit } from "../_lib/audit.js";
import type { Student } from "@shared/types.js";

const listQuery = z.object({
  search: z.string().optional(),
  classId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

const createBody = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  rollNo: z.string().min(1).max(40),
  classId: z.string().uuid(),
});

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const user = await authenticate(req);
  requireRole(user, "admin");
  const db = getAdminClient();

  if (req.method === "GET") {
    const q = parseQuery(listQuery, req.query);
    const ds = await loadDataset();
    let items = ds.students;
    if (q.classId) items = items.filter((s) => s.classId === q.classId);
    if (q.search) {
      const t = q.search.toLowerCase();
      items = items.filter(
        (s) =>
          s.fullName.toLowerCase().includes(t) ||
          s.rollNo.toLowerCase().includes(t) ||
          s.email.toLowerCase().includes(t),
      );
    }
    const total = items.length;
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    sendOk(res, { items: items.slice(start, start + pageSize), total, page, pageSize });
    return;
  }

  // POST — create a student. Creates an auth user (random password), a profile,
  // the student row, and the class enrollment. The admin should trigger a
  // password reset for the new student; no password is hardcoded.
  enforceBodySize(req);
  const input = parseBody(createBody, req.body);

  const existing = await db.from("students").select("id").eq("roll_no", input.rollNo).maybeSingle();
  if (existing.data) throw new HttpError(409, `Roll number ${input.rollNo} already exists`, "duplicate");

  const tempPassword = randomUUID() + "Aa1!";
  const created = await db.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, role: "student" },
  });
  if (created.error || !created.data.user) {
    throw new HttpError(400, created.error?.message ?? "Could not create auth user", "auth_create_failed");
  }
  const authId = created.data.user.id;

  const prof = await db.from("profiles").insert({
    id: authId,
    email: input.email,
    full_name: input.fullName,
    role: "student",
    active: true,
  });
  if (prof.error) throw new HttpError(400, "Could not create profile", "profile_failed");

  const studentIns = await db
    .from("students")
    .insert({ profile_id: authId, roll_no: input.rollNo, class_id: input.classId, active: true })
    .select("id")
    .single();
  if (studentIns.error || !studentIns.data) throw new HttpError(400, "Could not create student", "student_failed");

  await db.from("class_enrollments").insert({ class_id: input.classId, student_id: studentIns.data.id });

  const student: Student = {
    id: studentIns.data.id,
    profileId: authId,
    rollNo: input.rollNo,
    classId: input.classId,
    fullName: input.fullName,
    email: input.email,
    active: true,
  };
  await writeAudit(user, "create", "student", student.id, null, { rollNo: student.rollNo }, null);
  sendOk(res, student, 201);
});
