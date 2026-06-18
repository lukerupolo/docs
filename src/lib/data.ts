// Data access layer: lessons, words, stats. Built on top of the DocStore.
//
// Storage layout (one JSON doc per key):
//   lessons/index.json         -> Lesson[] (metadata + text)
//   words/<language>.json      -> Record<term, Word>
//
// Words are keyed by language so importing a vocab list tomorrow is a single
// merge into words/<language>.json.

import { getStore } from "./store";
import { initialSrs, isDue, review, Grade } from "./srs";
import {
  Lesson,
  Stats,
  Word,
  WordStatus,
  STATUS,
} from "./types";
import { countWords, normalize } from "./tokenize";

const DEFAULT_LANG = process.env.DEFAULT_LANGUAGE ?? "es";

function now() {
  return new Date().toISOString();
}

function id() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

// ---------- Lessons ----------

const LESSONS_KEY = "lessons/index.json";

export async function listLessons(): Promise<Lesson[]> {
  const store = getStore();
  return (await store.read<Lesson[]>(LESSONS_KEY)) ?? [];
}

export async function getLesson(lessonId: string): Promise<Lesson | null> {
  const lessons = await listLessons();
  return lessons.find((l) => l.id === lessonId) ?? null;
}

export async function createLesson(input: {
  title: string;
  text: string;
  language?: string;
  source?: string;
}): Promise<Lesson> {
  const store = getStore();
  const lessons = await listLessons();
  const lesson: Lesson = {
    id: id(),
    title: input.title.trim() || "Untitled",
    text: input.text,
    language: input.language ?? DEFAULT_LANG,
    source: input.source,
    wordCount: countWords(input.text),
    progress: 0,
    createdAt: now(),
    updatedAt: now(),
  };
  lessons.unshift(lesson);
  await store.write(LESSONS_KEY, lessons);
  return lesson;
}

export async function updateLessonProgress(
  lessonId: string,
  progress: number
): Promise<void> {
  const store = getStore();
  const lessons = await listLessons();
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) return;
  lesson.progress = Math.max(lesson.progress, progress);
  lesson.updatedAt = now();
  await store.write(LESSONS_KEY, lessons);
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const store = getStore();
  const lessons = await listLessons();
  await store.write(
    LESSONS_KEY,
    lessons.filter((l) => l.id !== lessonId)
  );
}

// ---------- Words ----------

function wordsKey(language: string) {
  return `words/${language}.json`;
}

export async function getWordMap(
  language = DEFAULT_LANG
): Promise<Record<string, Word>> {
  const store = getStore();
  return (await store.read<Record<string, Word>>(wordsKey(language))) ?? {};
}

async function writeWordMap(
  language: string,
  map: Record<string, Word>
): Promise<void> {
  await getStore().write(wordsKey(language), map);
}

export async function listWords(language = DEFAULT_LANG): Promise<Word[]> {
  const map = await getWordMap(language);
  return Object.values(map).sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : -1
  );
}

// Look up the status of many terms at once (used by the reader).
export async function getStatuses(
  terms: string[],
  language = DEFAULT_LANG
): Promise<Record<string, WordStatus>> {
  const map = await getWordMap(language);
  const out: Record<string, WordStatus> = {};
  for (const t of terms) {
    const w = map[normalize(t)];
    if (w) out[normalize(t)] = w.status;
  }
  return out;
}

export async function upsertWord(input: {
  term: string;
  display?: string;
  language?: string;
  status?: WordStatus;
  translation?: string;
  notes?: string;
  tags?: string[];
}): Promise<Word> {
  const language = input.language ?? DEFAULT_LANG;
  const term = normalize(input.term);
  const map = await getWordMap(language);
  const existing = map[term];
  const word: Word = existing
    ? { ...existing, updatedAt: now() }
    : {
        term,
        display: input.display ?? input.term,
        language,
        status: STATUS.NEW,
        srs: initialSrs(),
        createdAt: now(),
        updatedAt: now(),
      };

  if (input.status !== undefined) word.status = input.status;
  if (input.translation !== undefined) word.translation = input.translation;
  if (input.notes !== undefined) word.notes = input.notes;
  if (input.tags !== undefined) word.tags = input.tags;
  if (input.display !== undefined) word.display = input.display;

  map[term] = word;
  await writeWordMap(language, map);
  return word;
}

// Bulk import — the path we'll use tomorrow for your word list.
// Accepts entries of { term, translation?, status?, notes?, tags? }.
// Existing words are preserved unless overwrite=true.
export async function importWords(
  entries: Array<{
    term: string;
    translation?: string;
    status?: WordStatus;
    notes?: string;
    tags?: string[];
  }>,
  language = DEFAULT_LANG,
  overwrite = false
): Promise<{ added: number; updated: number; skipped: number }> {
  const map = await getWordMap(language);
  let added = 0;
  let updated = 0;
  let skipped = 0;
  for (const e of entries) {
    const term = normalize(e.term);
    if (!term) continue;
    const existing = map[term];
    if (existing && !overwrite) {
      skipped++;
      continue;
    }
    if (existing) {
      map[term] = {
        ...existing,
        translation: e.translation ?? existing.translation,
        notes: e.notes ?? existing.notes,
        tags: e.tags ?? existing.tags,
        status: e.status ?? existing.status,
        updatedAt: now(),
      };
      updated++;
    } else {
      map[term] = {
        term,
        display: e.term,
        language,
        status: e.status ?? STATUS.LEARNING_1,
        translation: e.translation,
        notes: e.notes,
        tags: e.tags,
        srs: initialSrs(),
        createdAt: now(),
        updatedAt: now(),
      };
      added++;
    }
  }
  await writeWordMap(language, map);
  return { added, updated, skipped };
}

export async function reviewWord(
  term: string,
  grade: Grade,
  language = DEFAULT_LANG
): Promise<Word | null> {
  const map = await getWordMap(language);
  const word = map[normalize(term)];
  if (!word) return null;
  const result = review(word.srs, word.status, grade);
  word.srs = result.srs;
  word.status = result.status;
  word.updatedAt = now();
  map[word.term] = word;
  await writeWordMap(language, map);
  return word;
}

export async function getDueWords(
  language = DEFAULT_LANG,
  limit = 20
): Promise<Word[]> {
  const words = await listWords(language);
  return words
    .filter((w) => w.status >= 1 && w.status <= 4 && isDue(w.srs))
    .slice(0, limit);
}

// ---------- Stats ----------

export async function getStats(language = DEFAULT_LANG): Promise<Stats> {
  const [words, lessons] = await Promise.all([
    listWords(language),
    listLessons(),
  ]);
  let known = 0;
  let learning = 0;
  let newSeen = 0;
  let ignored = 0;
  let due = 0;
  for (const w of words) {
    if (w.status === STATUS.KNOWN) known++;
    else if (w.status === STATUS.IGNORED) ignored++;
    else if (w.status === STATUS.NEW) newSeen++;
    else learning++;
    if (w.status >= 1 && w.status <= 4 && isDue(w.srs)) due++;
  }
  return {
    language,
    known,
    learning,
    newSeen,
    ignored,
    totalTracked: words.length,
    lessons: lessons.filter((l) => l.language === language).length,
    dueForReview: due,
  };
}
