import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { authenticate, requireRole } from "../_lib/auth.js";
import { allowMethods, sendOk, withErrors, parseBody, enforceBodySize, HttpError } from "../_lib/http.js";
import { getAdminClient } from "../_lib/supabase.js";
import { writeAudit } from "../_lib/audit.js";

const patchBody = z.object({ active: z.boolean() });

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["PATCH"])) return;
  const user = await authenticate(req);
  requireRole(user, "admin");
  enforceBodySize(req);

  const id = String(req.query.id);
  const { active } = parseBody(patchBody, req.body);
  const db = getAdminClient();

  const current = await db.from("students").select("id,profile_id,active").eq("id", id).single();
  if (current.error || !current.data) throw new HttpError(404, "Student not found", "not_found");

  const before = { active: current.data.active };
  const upd = await db.from("students").update({ active }).eq("id", id).select("*,profiles(full_name,email)").single();
  if (upd.error) throw new HttpError(400, "Could not update student", "update_failed");
  await db.from("profiles").update({ active }).eq("id", current.data.profile_id);

  await writeAudit(user, active ? "activate" : "deactivate", "student", id, before, { active }, null);

  const row = upd.data as { id: string; profile_id: string; roll_no: string; class_id: string; active: boolean; profiles: { full_name: string; email: string } };
  sendOk(res, {
    id: row.id,
    profileId: row.profile_id,
    rollNo: row.roll_no,
    classId: row.class_id,
    active: row.active,
    fullName: row.profiles?.full_name ?? "",
    email: row.profiles?.email ?? "",
  });
});
