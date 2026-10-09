import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { authenticate, requireRole } from "./_lib/auth.js";
import { allowMethods, sendOk, withErrors, parseBody, enforceBodySize, HttpError } from "./_lib/http.js";
import { getAdminClient } from "./_lib/supabase.js";

const createBody = z.object({ code: z.string().min(1).max(20), name: z.string().min(1).max(120) });

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const user = await authenticate(req);
  const db = getAdminClient();

  if (req.method === "GET") {
    const { data, error } = await db.from("subjects").select("*").order("code");
    if (error) throw new HttpError(500, "Could not load subjects", "db_error");
    sendOk(res, data ?? []);
    return;
  }

  requireRole(user, "admin");
  enforceBodySize(req);
  const input = parseBody(createBody, req.body);
  const dup = await db.from("subjects").select("id").eq("code", input.code).maybeSingle();
  if (dup.data) throw new HttpError(409, `Subject code ${input.code} already exists`, "duplicate");
  const ins = await db.from("subjects").insert({ code: input.code, name: input.name }).select("*").single();
  if (ins.error || !ins.data) throw new HttpError(400, "Could not create subject", "create_failed");
  sendOk(res, ins.data, 201);
});
