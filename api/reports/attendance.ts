import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { authenticate, requireRole } from "../_lib/auth.js";
import { allowMethods, sendOk, withErrors, parseQuery } from "../_lib/http.js";
import { loadDataset, scopeToTeacher } from "../_lib/dataset.js";
import { reportRows } from "@shared/selectors.js";

const query = z.object({
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  status: z.enum(["present", "absent", "late", "excused"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await authenticate(req);
  requireRole(user, "admin", "teacher");
  const filters = parseQuery(query, req.query);

  let ds = await loadDataset();
  if (user.profile.role === "teacher" && user.teacherId) ds = scopeToTeacher(ds, user.teacherId);

  sendOk(res, reportRows(ds, filters));
});
