"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Token } from "@/lib/tokenize";
import type { WordStatus } from "@/lib/types";
import WordPopup from "./WordPopup";

interface Props {
  lessonId: string;
  language: string;
  tokens: Token[];
  initialStatuses: Record<string, WordStatus>;
}

interface Selection {
  term: string;
  display: string;
  anchor: { x: number; y: number };
}

export default function Reader({
  lessonId,
  language,
  tokens,
  initialStatuses,
}: Props) {
  const [statuses, setStatuses] =
    useState<Record<string, WordStatus>>(initialStatuses);
  const [selection, setSelection] = useState<Selection | null>(null);
  const maxWordSeen = useRef(0);

  const totalWords = useMemo(
    () => tokens.filter((t) => t.isWord).length,
    [tokens]
  );

  const onWordClick = useCallback(
    (e: React.MouseEvent, token: Token) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setSelection({
        term: token.term,
        display: token.text,
        anchor: { x: rect.left, y: rect.bottom + 6 },
      });
      // track furthest word reached for progress
      if (token.wordIndex > maxWordSeen.current) {
        maxWordSeen.current = token.wordIndex;
        // fire-and-forget progress update
        fetch(`/api/lessons/${lessonId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progress: token.wordIndex }),
        }).catch(() => {});
      }
    },
    [lessonId]
  );

  const handleSaved = useCallback((term: string, status: WordStatus) => {
    setStatuses((prev) => ({ ...prev, [term]: status }));
  }, []);

  // Words not yet tracked default to "new" (status 0) visually.
  const classFor = (term: string) => {
    const s = statuses[term];
    const effective = s === undefined ? 0 : s;
    if (effective === -1) return "word sm1";
    return `word s${effective}`;
  };

  const markAllKnown = useCallback(async () => {
    // Any word currently shown as "new" gets marked known in bulk.
    const terms = new Set<string>();
    for (const t of tokens) {
      if (t.isWord && (statuses[t.term] === undefined || statuses[t.term] === 0))
        terms.add(t.term);
    }
    if (terms.size === 0) return;
    await fetch("/api/words/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language,
        overwrite: true,
        entries: [...terms].map((term) => ({ term, status: 5 })),
      }),
    });
    const next = { ...statuses };
    for (const term of terms) next[term] = 5;
    setStatuses(next);
  }, [tokens, statuses, language]);

  return (
    <>
      <div className="row between" style={{ marginBottom: 14 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Click a word to set its status. New words are highlighted blue.
        </span>
        <button className="ghost" onClick={markAllKnown}>
          Mark page known
        </button>
      </div>

      <div className="card reader">
        {tokens.map((t, i) =>
          t.isWord ? (
            <span
              key={i}
              className={classFor(t.term)}
              onClick={(e) => onWordClick(e, t)}
            >
              {t.text}
            </span>
          ) : (
            <span key={i} style={{ whiteSpace: "pre-wrap" }}>
              {t.text}
            </span>
          )
        )}
      </div>

      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        {totalWords} words in this lesson.
      </div>

      {selection && (
        <WordPopup
          key={selection.term}
          term={selection.term}
          display={selection.display}
          language={language}
          status={statuses[selection.term]}
          anchor={selection.anchor}
          onClose={() => setSelection(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
