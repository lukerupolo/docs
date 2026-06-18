import { SrsState, WordStatus } from "./types";

export function initialSrs(now = new Date()): SrsState {
  return {
    ease: 2.5,
    intervalDays: 0,
    reps: 0,
    lapses: 0,
    dueDate: now.toISOString(),
  };
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Review grade: "again" (forgot), "good" (recalled), "easy" (trivial).
export type Grade = "again" | "good" | "easy";

// Update SRS state and learning status after a review.
// Returns the new SRS state plus the suggested status change.
export function review(
  srs: SrsState,
  status: WordStatus,
  grade: Grade,
  now = new Date()
): { srs: SrsState; status: WordStatus } {
  const next: SrsState = { ...srs };
  let nextStatus = status;

  if (grade === "again") {
    next.reps = 0;
    next.lapses += 1;
    next.ease = Math.max(1.3, next.ease - 0.2);
    next.intervalDays = 1;
    // Drop a learning level (but not below 1 once it's being studied).
    if (status > 1 && status < 5) nextStatus = (status - 1) as WordStatus;
    if (status === 5) nextStatus = 4; // a known word slipped — back to learning
  } else {
    next.reps += 1;
    if (grade === "easy") next.ease += 0.15;
    if (next.reps === 1) {
      next.intervalDays = grade === "easy" ? 4 : 1;
    } else if (next.reps === 2) {
      next.intervalDays = grade === "easy" ? 10 : 6;
    } else {
      next.intervalDays = Math.round(
        next.intervalDays * next.ease * (grade === "easy" ? 1.3 : 1)
      );
    }
    // Advance learning level on success.
    if (status >= 1 && status < 5) {
      const bump = grade === "easy" ? 2 : 1;
      nextStatus = Math.min(5, status + bump) as WordStatus;
    }
  }

  next.dueDate = addDays(now, Math.max(1, next.intervalDays)).toISOString();
  return { srs: next, status: nextStatus };
}

export function isDue(srs: SrsState, now = new Date()): boolean {
  return new Date(srs.dueDate).getTime() <= now.getTime();
}
