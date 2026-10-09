import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { authenticate, requireRole } from "./_lib/auth.js";
import { allowMethods, sendOk, withErrors, parseBody, enforceBodySize, rateLimit, HttpError } from "./_lib/http.js";
import { getAdminClient } from "./_lib/supabase.js";
import { writeAudit } from "./_lib/audit.js";

const body = z.object({
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const user = await authenticate(req);
  requireRole(user, "teacher");
  enforceBodySize(req);
  rateLimit(`sessions:${user.profile.id}`, 60, 60_000);

  const input = parseBody(body, req.body);
  const db = getAdminClient();

  // Teacher must be assigned to this class+subject.
  const assigned = await db
    .from("teacher_assignments")
    .select("id")
    .eq("teacher_id", user.teacherId)
    .eq("class_id", input.classId)
    .eq("subject_id", input.subjectId)
    .maybeSingle();
  if (!assigned.data) throw new HttpError(403, "You are not assigned to this class/subject", "forbidden");

  const existing = await db
    .from("class_sessions")
    .select("*")
    .eq("class_id", input.classId)
    .eq("subject_id", input.subjectId)
    .eq("date", input.date)
    .eq("teacher_id", user.teacherId)
    .maybeSingle();

  let row = existing.data;
  if (!row) {
    const ins = await db
      .from("class_sessions")
      .insert({ class_id: input.classId, subject_id: input.subjectId, teacher_id: user.teacherId, date: input.date, status: "completed" })
      .select("*")
      .single();
    if (ins.error || !ins.data) throw new HttpError(400, "Could not create session", "create_failed");
    row = ins.data;
    await writeAudit(user, "create", "class_session", row.id, null, { date: input.date }, null);
  }

  sendOk(res, {
    id: row.id,
    classId: row.class_id,
    subjectId: row.subject_id,
    teacherId: row.teacher_id,
    date: row.date,
    status: row.status,
  });
});
