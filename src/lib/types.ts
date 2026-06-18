// Core domain types for the LingQ-style app.

// Word learning status, modeled on LingQ:
//   0 = new (unseen, highlighted blue)
//   1..4 = learning levels (yellow, fading as you learn)
//   5 = known (no highlight)
//   -1 = ignored (names, numbers, punctuation you never want to track)
export type WordStatus = -1 | 0 | 1 | 2 | 3 | 4 | 5;

export const STATUS = {
  IGNORED: -1 as WordStatus,
  NEW: 0 as WordStatus,
  LEARNING_1: 1 as WordStatus,
  LEARNING_2: 2 as WordStatus,
  LEARNING_3: 3 as WordStatus,
  LEARNING_4: 4 as WordStatus,
  KNOWN: 5 as WordStatus,
};

export const STATUS_LABELS: Record<WordStatus, string> = {
  [-1]: "Ignored",
  [0]: "New",
  [1]: "Learning 1",
  [2]: "Learning 2",
  [3]: "Learning 3",
  [4]: "Learning 4",
  [5]: "Known",
};

// Spaced-repetition scheduling state (SM-2 lite).
export interface SrsState {
  ease: number; // ease factor, starts at 2.5
  intervalDays: number; // current interval
  reps: number; // successful reviews in a row
  lapses: number; // times forgotten
  dueDate: string; // ISO date the card is next due
}

export interface Word {
  term: string; // normalized (lowercased) headword — the storage key
  display: string; // the form as first encountered (for display)
  language: string;
  status: WordStatus;
  translation?: string;
  notes?: string;
  tags?: string[];
  srs: SrsState;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  language: string;
  text: string;
  source?: string;
  wordCount: number;
  // index of the last word the reader reached, for resume
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  language: string;
  known: number;
  learning: number;
  newSeen: number; // tracked words still at status 0
  ignored: number;
  totalTracked: number;
  lessons: number;
  dueForReview: number;
}
