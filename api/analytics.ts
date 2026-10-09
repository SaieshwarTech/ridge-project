import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, requireRole } from "./_lib/auth.js";
import { allowMethods, sendOk, withErrors } from "./_lib/http.js";
import { loadDataset, scopeToTeacher } from "./_lib/dataset.js";
import { THRESHOLD } from "./_lib/supabase.js";
import { todayISO } from "./_lib/audit.js";
import { subjectRates, classRates, attendanceTrends, studentsBelowThreshold } from "@shared/selectors.js";

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await authenticate(req);
  requireRole(user, "admin", "teacher");

  let ds = await loadDataset();
  if (user.profile.role === "teacher" && user.teacherId) ds = scopeToTeacher(ds, user.teacherId);

  sendOk(res, {
    subjectRates: subjectRates(ds),
    classRates: classRates(ds),
    trends30: attendanceTrends(ds, 30, todayISO()),
    atRisk: studentsBelowThreshold(ds, THRESHOLD),
    threshold: THRESHOLD,
  });
});
