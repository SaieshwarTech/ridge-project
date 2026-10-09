import type { VercelRequest } from "@vercel/node";
import type { Profile, Role, SessionUser } from "@shared/types.js";
import { getAdminClient } from "./supabase.js";
import { HttpError } from "./http.js";

function bearer(req: VercelRequest): string {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "Missing or malformed Authorization header", "unauthenticated");
  }
  return token;
}

/**
 * Authenticate the request: verify the Supabase JWT, then load the linked
 * profile and role-scoped ids from the database. The role is read from the
 * DATABASE, never from anything the client sends.
 */
export async function authenticate(req: VercelRequest): Promise<SessionUser> {
  const token = bearer(req);
  const supabase = getAdminClient();

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData.user) {
    throw new HttpError(401, "Invalid or expired session", "unauthenticated");
  }
  const authId = userData.user.id;

  const { data: profileRow, error: pErr } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,active,created_at")
    .eq("id", authId)
    .single();
  if (pErr || !profileRow) {
    throw new HttpError(403, "No profile is linked to this account", "no_profile");
  }
  if (!profileRow.active) {
    throw new HttpError(403, "This account is deactivated", "deactivated");
  }

  const profile: Profile = {
    id: profileRow.id,
    email: profileRow.email,
    fullName: profileRow.full_name,
    role: profileRow.role as Role,
    active: profileRow.active,
    createdAt: profileRow.created_at,
  };

  const session: SessionUser = { profile };
  if (profile.role === "student") {
    const { data } = await supabase.from("students").select("id").eq("profile_id", authId).single();
    session.studentId = data?.id;
  } else if (profile.role === "teacher") {
    const { data } = await supabase.from("teachers").select("id").eq("profile_id", authId).single();
    session.teacherId = data?.id;
  }
  return session;
}

export function requireRole(user: SessionUser, ...roles: Role[]): void {
  if (!roles.includes(user.profile.role)) {
    throw new HttpError(403, "You do not have permission to perform this action", "forbidden");
  }
}
