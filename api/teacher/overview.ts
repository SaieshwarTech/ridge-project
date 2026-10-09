import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, requireRole } from "../_lib/auth.js";
import { allowMethods, sendOk, withErrors, HttpError } from "../_lib/http.js";
import { loadDataset } from "../_lib/dataset.js";
import { todayISO } from "../_lib/audit.js";
import { teacherOverview } from "@shared/selectors.js";

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await authenticate(req);
  requireRole(user, "teacher");
  if (!user.teacherId) throw new HttpError(403, "No teacher record linked to this account", "no_teacher");

  const ds = await loadDataset();
  sendOk(res, teacherOverview(ds, user.teacherId, todayISO()));
});
