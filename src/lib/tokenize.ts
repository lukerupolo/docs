// Split text into tokens, preserving whitespace and punctuation so the reader
// can render the original text faithfully while making words clickable.

export interface Token {
  // The raw text of this token (word, space, or punctuation).
  text: string;
  // True if this token is a word that can be clicked / tracked.
  isWord: boolean;
  // Normalized headword (lowercased) for words; "" otherwise.
  term: string;
  // Sequential index among word tokens only (for progress); -1 for non-words.
  wordIndex: number;
}

// Unicode-aware word matcher: letters (incl. accents) and apostrophes/hyphens
// inside words. Everything else is treated as a separator token.
const WORD_RE = /[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu;

export function normalize(word: string): string {
  return word.toLowerCase().normalize("NFC");
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let wordIndex = 0;
  for (const match of text.matchAll(WORD_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      tokens.push({
        text: text.slice(lastIndex, start),
        isWord: false,
        term: "",
        wordIndex: -1,
      });
    }
    const raw = match[0];
    tokens.push({
      text: raw,
      isWord: true,
      term: normalize(raw),
      wordIndex: wordIndex++,
    });
    lastIndex = start + raw.length;
  }
  if (lastIndex < text.length) {
    tokens.push({
      text: text.slice(lastIndex),
      isWord: false,
      term: "",
      wordIndex: -1,
    });
  }
  return tokens;
}

// Count distinct word occurrences (total words, not unique).
export function countWords(text: string): number {
  let n = 0;
  for (const _ of text.matchAll(WORD_RE)) n++;
  return n;
}

// Unique normalized terms in a text.
export function uniqueTerms(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(WORD_RE)) set.add(normalize(m[0]));
  return [...set];
}
