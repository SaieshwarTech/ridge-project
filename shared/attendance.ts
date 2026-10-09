// ============================================================================
// Attendance business logic — pure, deterministic, and unit-tested.
//
// Counting policy (documented and enforced here):
//   present   -> attended   (counts in numerator AND denominator)
//   late      -> attended   (counts in numerator AND denominator; shown apart)
//   absent    -> not attended (counts in denominator only)
//   excused   -> excluded entirely from the denominator (institutional policy)
//   cancelled sessions        -> excluded (not eligible)
//   scheduled / upcoming / unmarked sessions -> excluded (not eligible)
//
//   percentage = (present + late) / eligible * 100
//   eligible   = present + late + absent
// ============================================================================

import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassSession,
  Subject,
  SubjectAttendance,
} from "./types.js";

export const DEFAULT_THRESHOLD = 75;

export interface Counts {
  present: number;
  late: number;
  absent: number;
  excused: number;
}

export function emptyCounts(): Counts {
  return { present: 0, late: 0, absent: 0, excused: 0 };
}

export function addToCounts(counts: Counts, status: AttendanceStatus): Counts {
  counts[status] += 1;
  return counts;
}

/** Sessions that count toward attendance: only completed ones. */
export function attendedCount(c: Counts): number {
  return c.present + c.late;
}

/** Denominator: present + late + absent. Excused is excluded by policy. */
export function eligibleCount(c: Counts): number {
  return c.present + c.late + c.absent;
}

/** Attendance percentage. Zero eligible sessions => 0 (nothing to measure yet). */
export function percentage(c: Counts): number {
  const eligible = eligibleCount(c);
  if (eligible === 0) return 0;
  return round2((attendedCount(c) / eligible) * 100);
}

export interface NeededResult {
  /** future consecutive attended sessions required to reach the threshold. */
  needed: number | null;
  reachable: boolean;
  /** human-readable reason when needed is null. */
  reason?: string;
}

/**
 * Minimum number of future *consecutive attended* sessions `x` required so that
 *   (attended + x) / (eligible + x) >= threshold
 *
 * Solving for x:  x >= (T*eligible - attended) / (1 - T)
 */
export function sessionsNeeded(c: Counts, thresholdPct = DEFAULT_THRESHOLD): NeededResult {
  const T = thresholdPct / 100;
  const attended = attendedCount(c);
  const eligible = eligibleCount(c);

  if (eligible === 0) {
    return { needed: null, reachable: true, reason: "No eligible sessions recorded yet." };
  }
  if (attended / eligible >= T) {
    return { needed: 0, reachable: true };
  }
  if (T >= 1) {
    // Only reachable if already at/above 100%, handled above.
    return { needed: null, reachable: false, reason: "100% attendance is required and cannot be recovered." };
  }
  const x = Math.ceil((T * eligible - attended) / (1 - T));
  return { needed: x, reachable: true };
}

/**
 * Build per-subject attendance for a single student.
 * Only records attached to a *completed* session are considered.
 */
export function computeSubjectAttendance(
  studentId: string,
  records: AttendanceRecord[],
  sessions: ClassSession[],
  subjects: Subject[],
  thresholdPct = DEFAULT_THRESHOLD,
): SubjectAttendance[] {
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const countsBySubject = new Map<string, Counts>();

  for (const rec of records) {
    if (rec.studentId !== studentId) continue;
    const session = sessionById.get(rec.sessionId);
    if (!session || session.status !== "completed") continue;
    const counts = countsBySubject.get(session.subjectId) ?? emptyCounts();
    addToCounts(counts, rec.status);
    countsBySubject.set(session.subjectId, counts);
  }

  const result: SubjectAttendance[] = [];
  for (const subject of subjects) {
    const counts = countsBySubject.get(subject.id);
    if (!counts) continue; // subject the student has no sessions for
    const need = sessionsNeeded(counts, thresholdPct);
    result.push({
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      present: counts.present,
      late: counts.late,
      absent: counts.absent,
      excused: counts.excused,
      eligible: eligibleCount(counts),
      percentage: percentage(counts),
      needed: need.needed,
      reachable: need.reachable,
    });
  }
  return result.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

/** Aggregate counts across many subject rows into one overall figure. */
export function overallFromSubjects(rows: SubjectAttendance[]): Counts {
  return rows.reduce<Counts>((acc, r) => {
    acc.present += r.present;
    acc.late += r.late;
    acc.absent += r.absent;
    acc.excused += r.excused;
    return acc;
  }, emptyCounts());
}

/** Aggregate a flat list of completed-session records into counts. */
export function countsFromRecords(
  records: AttendanceRecord[],
  completedSessionIds: Set<string>,
): Counts {
  const counts = emptyCounts();
  for (const rec of records) {
    if (!completedSessionIds.has(rec.sessionId)) continue;
    addToCounts(counts, rec.status);
  }
  return counts;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
