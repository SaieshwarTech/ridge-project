import { describe, it, expect } from "vitest";
import {
  percentage,
  eligibleCount,
  attendedCount,
  sessionsNeeded,
  computeSubjectAttendance,
  emptyCounts,
  type Counts,
} from "./attendance.js";
import type { AttendanceRecord, ClassSession, Subject, SessionStatus } from "./types.js";

const c = (p: number, l: number, a: number, e = 0): Counts => ({
  present: p,
  late: l,
  absent: a,
  excused: e,
});

describe("percentage", () => {
  it("zero sessions => 0% (nothing to measure)", () => {
    expect(percentage(emptyCounts())).toBe(0);
    expect(eligibleCount(emptyCounts())).toBe(0);
  });

  it("100% attendance", () => {
    expect(percentage(c(10, 0, 0))).toBe(100);
  });

  it("exactly 75%", () => {
    expect(percentage(c(3, 0, 1))).toBe(75); // 3/4
  });

  it("below 75%", () => {
    expect(percentage(c(2, 0, 3))).toBe(40); // 2/5
  });

  it("late counts as attended", () => {
    expect(percentage(c(2, 2, 0))).toBe(100); // (2+2)/4
    expect(attendedCount(c(2, 2, 0))).toBe(4);
  });

  it("excused is excluded from the denominator", () => {
    // present 3, absent 1, excused 5 -> 3/4 = 75 (excused ignored)
    expect(percentage(c(3, 0, 1, 5))).toBe(75);
    expect(eligibleCount(c(3, 0, 1, 5))).toBe(4);
  });
});

describe("sessionsNeeded (target 75%)", () => {
  it("already above threshold => 0 needed", () => {
    expect(sessionsNeeded(c(8, 0, 1)).needed).toBe(0);
  });

  it("exactly at threshold => 0 needed", () => {
    expect(sessionsNeeded(c(3, 0, 1)).needed).toBe(0);
  });

  it("below threshold => correct positive count", () => {
    // 2/5 = 40%. Need x: (2+x)/(5+x) >= 0.75 -> x >= (3.75-2)/0.25 = 7
    const res = sessionsNeeded(c(2, 0, 3));
    expect(res.needed).toBe(7);
    expect(res.reachable).toBe(true);
    // verify it actually reaches threshold
    expect(percentage(c(2 + 7, 0, 3))).toBeGreaterThanOrEqual(75);
  });

  it("no eligible sessions => not applicable", () => {
    const res = sessionsNeeded(emptyCounts());
    expect(res.needed).toBeNull();
    expect(res.reachable).toBe(true);
  });

  it("late sessions count toward the attended numerator", () => {
    // 1 present + 1 late + 6 absent = 2/8 = 25%
    const res = sessionsNeeded(c(1, 1, 6));
    // (2+x)/(8+x) >= .75 -> x >= (6-2)/0.25 = 16
    expect(res.needed).toBe(16);
  });
});

describe("computeSubjectAttendance", () => {
  const subjects: Subject[] = [
    { id: "sub1", code: "CS101", name: "Algorithms" },
    { id: "sub2", code: "CS102", name: "Databases" },
  ];
  const sessions: ClassSession[] = [
    { id: " s1", classId: "c1", subjectId: "sub1", teacherId: "t1", date: "2026-01-01", status: "completed" },
    { id: "s2", classId: "c1", subjectId: "sub1", teacherId: "t1", date: "2026-01-02", status: "completed" },
    { id: "s3", classId: "c1", subjectId: "sub1", teacherId: "t1", date: "2026-01-03", status: "cancelled" },
    { id: "s4", classId: "c1", subjectId: "sub1", teacherId: "t1", date: "2026-01-04", status: "scheduled" },
    { id: "s5", classId: "c1", subjectId: "sub2", teacherId: "t1", date: "2026-01-01", status: "completed" },
  ].map((s) => ({ ...s, id: s.id.trim(), status: s.status as SessionStatus }));

  const rec = (id: string, sessionId: string, status: AttendanceRecord["status"]): AttendanceRecord => ({
    id,
    sessionId,
    studentId: "stu1",
    status,
    markedAt: "2026-01-01T00:00:00Z",
    markedBy: "t1",
  });

  it("excludes cancelled and scheduled sessions from the calculation", () => {
    const records: AttendanceRecord[] = [
      rec("r1", "s1", "present"),
      rec("r2", "s2", "absent"),
      rec("r3", "s3", "present"), // cancelled session -> ignored
      rec("r4", "s4", "present"), // scheduled session -> ignored
      rec("r5", "s5", "late"),
    ];
    const rows = computeSubjectAttendance("stu1", records, sessions, subjects);
    const algo = rows.find((r) => r.subjectId === "sub1")!;
    expect(algo.eligible).toBe(2); // only s1 + s2
    expect(algo.present).toBe(1);
    expect(algo.absent).toBe(1);
    expect(algo.percentage).toBe(50);

    const db = rows.find((r) => r.subjectId === "sub2")!;
    expect(db.eligible).toBe(1);
    expect(db.late).toBe(1);
    expect(db.percentage).toBe(100);
  });

  it("ignores records belonging to other students", () => {
    const records: AttendanceRecord[] = [
      { ...rec("r1", "s1", "present"), studentId: "other" },
    ];
    const rows = computeSubjectAttendance("stu1", records, sessions, subjects);
    expect(rows.length).toBe(0);
  });
});
