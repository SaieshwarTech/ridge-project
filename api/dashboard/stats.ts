import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, requireRole } from "../_lib/auth.js";
import { allowMethods, sendOk, withErrors } from "../_lib/http.js";
import { loadDataset } from "../_lib/dataset.js";
import { THRESHOLD } from "../_lib/supabase.js";
import { todayISO } from "../_lib/audit.js";
import { adminStats, attendanceTrends, subjectRates, classRates, recentActivity } from "@shared/selectors.js";

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await authenticate(req);
  requireRole(user, "admin");

  const ds = await loadDataset();
  const today = todayISO();
  sendOk(res, {
    stats: adminStats(ds, THRESHOLD),
    trends7: attendanceTrends(ds, 7, today),
    trends30: attendanceTrends(ds, 30, today),
    subjectRates: subjectRates(ds),
    classRates: classRates(ds),
    recent: recentActivity(ds, 8),
  });
});
