import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { authenticate, requireRole } from "./_lib/auth.js";
import { allowMethods, sendOk, withErrors, parseBody, enforceBodySize, HttpError } from "./_lib/http.js";
import { getAdminClient } from "./_lib/supabase.js";

const createBody = z.object({
  name: z.string().min(1).max(120),
  section: z.string().min(1).max(20),
  academicYear: z.string().min(4).max(20),
});

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const user = await authenticate(req);
  const db = getAdminClient();

  if (req.method === "GET") {
    // Any authenticated user may read the class list (needed for pickers).
    const { data, error } = await db.from("classes").select("*").order("name");
    if (error) throw new HttpError(500, "Could not load classes", "db_error");
    sendOk(res, (data ?? []).map((c) => ({ id: c.id, name: c.name, section: c.section, academicYear: c.academic_year })));
    return;
  }

  requireRole(user, "admin");
  enforceBodySize(req);
  const input = parseBody(createBody, req.body);
  const ins = await db
    .from("classes")
    .insert({ name: input.name, section: input.section, academic_year: input.academicYear })
    .select("*")
    .single();
  if (ins.error || !ins.data) throw new HttpError(400, "Could not create class", "create_failed");
  sendOk(res, { id: ins.data.id, name: ins.data.name, section: ins.data.section, academicYear: ins.data.academic_year }, 201);
});
