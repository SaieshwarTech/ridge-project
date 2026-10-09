import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, requireRole } from "../_lib/auth.js";
import { allowMethods, sendOk, withErrors, HttpError } from "../_lib/http.js";
import { loadDataset } from "../_lib/dataset.js";
import { THRESHOLD } from "../_lib/supabase.js";
import { todayISO } from "../_lib/audit.js";
import { studentOverview } from "@shared/selectors.js";

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await authenticate(req);
  requireRole(user, "student");
  if (!user.studentId) throw new HttpError(403, "No student record linked to this account", "no_student");

  const ds = await loadDataset();
  // A student can only ever see their own id — taken from the verified session.
  sendOk(res, studentOverview(ds, user.studentId, THRESHOLD, todayISO()));
});
