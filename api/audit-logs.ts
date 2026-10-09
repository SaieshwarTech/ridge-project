import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { authenticate, requireRole } from "./_lib/auth.js";
import { allowMethods, sendOk, withErrors, parseQuery, HttpError } from "./_lib/http.js";
import { getAdminClient } from "./_lib/supabase.js";

const query = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await authenticate(req);
  requireRole(user, "admin");
  const parsed = parseQuery(query, req.query);
  const page = parsed.page ?? 1;
  const pageSize = parsed.pageSize ?? 20;
  const db = getAdminClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await db
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw new HttpError(500, "Could not load audit logs", "db_error");

  sendOk(res, {
    items: (data ?? []).map((l) => ({
      id: l.id,
      actorId: l.actor_id,
      actorName: l.actor_name,
      action: l.action,
      entity: l.entity,
      entityId: l.entity_id,
      before: l.before,
      after: l.after,
      reason: l.reason,
      timestamp: l.created_at,
    })),
    total: count ?? 0,
    page,
    pageSize,
  });
});
