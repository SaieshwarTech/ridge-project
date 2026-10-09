import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate } from "./_lib/auth.js";
import { allowMethods, sendOk, withErrors } from "./_lib/http.js";

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await authenticate(req);
  sendOk(res, user);
});
