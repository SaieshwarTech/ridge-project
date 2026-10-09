import type { SessionUser } from "@shared/types.js";
import { getAdminClient } from "./supabase.js";

export async function writeAudit(
  user: SessionUser,
  action: string,
  entity: string,
  entityId: string,
  before: unknown,
  after: unknown,
  reason: string | null,
): Promise<void> {
  await getAdminClient()
    .from("audit_logs")
    .insert({
      actor_id: user.profile.id,
      actor_name: user.profile.fullName,
      action,
      entity,
      entity_id: entityId,
      before: before ?? null,
      after: after ?? null,
      reason,
    });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
