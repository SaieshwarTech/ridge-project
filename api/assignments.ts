import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, requireRole } from "./_lib/auth.js";
import { allowMethods, sendOk, withErrors, HttpError } from "./_lib/http.js";
import { getAdminClient } from "./_lib/supabase.js";

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await authenticate(req);
  requireRole(user, "admin");
  const { data, error } = await getAdminClient().from("teacher_assignments").select("*");
  if (error) throw new HttpError(500, "Could not load assignments", "db_error");
  sendOk(res, (data ?? []).map((a) => ({ id: a.id, teacherId: a.teacher_id, classId: a.class_id, subjectId: a.subject_id })));
});
