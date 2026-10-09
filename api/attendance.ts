import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { authenticate, requireRole } from "./_lib/auth.js";
import { allowMethods, sendOk, withErrors, parseBody, parseQuery, enforceBodySize, rateLimit, HttpError } from "./_lib/http.js";
import { getAdminClient } from "./_lib/supabase.js";
import { writeAudit } from "./_lib/audit.js";

const getQuery = z.object({ sessionId: z.string().min(1) });

const saveBody = z.object({
  sessionId: z.string().min(1),
  reason: z.string().max(500).optional(),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(["present", "absent", "late", "excused"]),
      }),
    )
    .min(1)
    .max(500),
});

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const user = await authenticate(req);
  const db = getAdminClient();

  if (req.method === "GET") {
    requireRole(user, "teacher", "admin");
    const { sessionId } = parseQuery(getQuery, req.query);
    const session = await db.from("class_sessions").select("teacher_id").eq("id", sessionId).single();
    if (session.error || !session.data) throw new HttpError(404, "Session not found", "not_found");
    if (user.profile.role === "teacher" && session.data.teacher_id !== user.teacherId) {
      throw new HttpError(403, "You can only view your own sessions", "forbidden");
    }
    const { data } = await db.from("attendance_records").select("*").eq("session_id", sessionId);
    sendOk(res, (data ?? []).map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      studentId: r.student_id,
      status: r.status,
      markedAt: r.marked_at,
      markedBy: r.marked_by,
    })));
    return;
  }

  // POST — save attendance for a session the teacher owns.
  requireRole(user, "teacher");
  enforceBodySize(req);
  rateLimit(`attendance:${user.profile.id}`, 120, 60_000);
  const input = parseBody(saveBody, req.body);

  const session = await db.from("class_sessions").select("*").eq("id", input.sessionId).single();
  if (session.error || !session.data) throw new HttpError(404, "Session not found", "not_found");
  if (session.data.teacher_id !== user.teacherId) throw new HttpError(403, "You can only mark your own sessions", "forbidden");
  if (session.data.status === "cancelled") throw new HttpError(409, "Cannot mark a cancelled session", "cancelled");

  // Validate every student is enrolled in the session's class.
  const enrolled = await db.from("class_enrollments").select("student_id").eq("class_id", session.data.class_id);
  const enrolledIds = new Set((enrolled.data ?? []).map((e) => e.student_id));
  for (const entry of input.entries) {
    if (!enrolledIds.has(entry.studentId)) {
      throw new HttpError(400, "A student in the list is not enrolled in this class", "not_enrolled");
    }
  }

  const existing = await db.from("attendance_records").select("*").eq("session_id", input.sessionId);
  const byStudent = new Map((existing.data ?? []).map((r) => [r.student_id, r]));

  const toInsert: Record<string, unknown>[] = [];
  for (const entry of input.entries) {
    const prior = byStudent.get(entry.studentId);
    if (prior) {
      if (prior.status !== entry.status) {
        const upd = await db
          .from("attendance_records")
          .update({ status: entry.status, marked_at: new Date().toISOString(), marked_by: user.teacherId })
          .eq("id", prior.id);
        if (upd.error) throw new HttpError(400, "Could not update attendance", "update_failed");
        await writeAudit(user, "edit", "attendance_record", prior.id, { status: prior.status }, { status: entry.status }, input.reason ?? "Correction");
      }
    } else {
      toInsert.push({
        session_id: input.sessionId,
        student_id: entry.studentId,
        status: entry.status,
        marked_by: user.teacherId,
        marked_at: new Date().toISOString(),
      });
    }
  }

  if (toInsert.length > 0) {
    // The unique (session_id, student_id) constraint prevents duplicates.
    const ins = await db.from("attendance_records").insert(toInsert);
    if (ins.error) throw new HttpError(409, "Duplicate or invalid attendance record", "duplicate");
    await writeAudit(user, "create", "attendance_record", input.sessionId, null, { count: toInsert.length }, input.reason ?? null);
  }

  sendOk(res, { saved: input.entries.length });
});
