import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authenticate, requireRole } from "./_lib/auth.js";
import { allowMethods, sendOk, withErrors, parseBody, enforceBodySize, HttpError } from "./_lib/http.js";
import { getAdminClient } from "./_lib/supabase.js";
import { loadDataset } from "./_lib/dataset.js";
import { writeAudit } from "./_lib/audit.js";

const createBody = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  department: z.string().min(2).max(120),
});

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const user = await authenticate(req);
  requireRole(user, "admin");
  const db = getAdminClient();

  if (req.method === "GET") {
    const ds = await loadDataset();
    sendOk(res, ds.teachers);
    return;
  }

  enforceBodySize(req);
  const input = parseBody(createBody, req.body);
  const tempPassword = randomUUID() + "Aa1!";
  const created = await db.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, role: "teacher" },
  });
  if (created.error || !created.data.user) {
    throw new HttpError(400, created.error?.message ?? "Could not create auth user", "auth_create_failed");
  }
  const authId = created.data.user.id;
  const prof = await db.from("profiles").insert({ id: authId, email: input.email, full_name: input.fullName, role: "teacher", active: true });
  if (prof.error) throw new HttpError(400, "Could not create profile", "profile_failed");
  const ins = await db.from("teachers").insert({ profile_id: authId, department: input.department, active: true }).select("id").single();
  if (ins.error || !ins.data) throw new HttpError(400, "Could not create teacher", "teacher_failed");

  await writeAudit(user, "create", "teacher", ins.data.id, null, { email: input.email }, null);
  sendOk(res, {
    id: ins.data.id,
    profileId: authId,
    department: input.department,
    fullName: input.fullName,
    email: input.email,
    active: true,
  }, 201);
});
