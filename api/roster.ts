import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { authenticate, requireRole } from "./_lib/auth.js";
import { allowMethods, sendOk, withErrors, parseQuery, HttpError } from "./_lib/http.js";
import { getAdminClient } from "./_lib/supabase.js";
import { loadDataset } from "./_lib/dataset.js";

const query = z.object({ classId: z.string().min(1) });

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await authenticate(req);
  requireRole(user, "teacher", "admin");
  const { classId } = parseQuery(query, req.query);

  if (user.profile.role === "teacher") {
    const assigned = await getAdminClient()
      .from("teacher_assignments")
      .select("id")
      .eq("teacher_id", user.teacherId)
      .eq("class_id", classId)
      .maybeSingle();
    if (!assigned.data) throw new HttpError(403, "You are not assigned to this class", "forbidden");
  }

  const ds = await loadDataset();
  const enrolled = new Set(ds.enrollments.filter((e) => e.classId === classId).map((e) => e.studentId));
  sendOk(res, ds.students.filter((s) => enrolled.has(s.id)));
});
