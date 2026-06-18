"use client";

import { useEffect, useMemo, useState } from "react";
import { STATUS_LABELS, Word, WordStatus } from "@/lib/types";

const FILTERS: { label: string; test: (s: WordStatus) => boolean }[] = [
  { label: "All", test: () => true },
  { label: "Learning", test: (s) => s >= 1 && s <= 4 },
  { label: "Known", test: (s) => s === 5 },
  { label: "New", test: (s) => s === 0 },
  { label: "Ignored", test: (s) => s === -1 },
];

export default function VocabPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(0);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/words")
      .then((r) => r.json())
      .then((w: Word[]) => setWords(w))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => {
    const f = FILTERS[filter].test;
    const query = q.trim().toLowerCase();
    return words.filter(
      (w) =>
        f(w.status) &&
        (!query ||
          w.term.includes(query) ||
          (w.translation ?? "").toLowerCase().includes(query))
    );
  }, [words, filter, q]);

  return (
    <main className="container">
      <h1>Vocabulary</h1>
      <p className="muted">Every word you&apos;ve saved, with its status.</p>

      <div className="row" style={{ gap: 8, flexWrap: "wrap", margin: "14px 0" }}>
        {FILTERS.map((f, i) => (
          <span
            key={f.label}
            className={`chip ${filter === i ? "active" : ""}`}
            onClick={() => setFilter(i)}
          >
            {f.label}
          </span>
        ))}
      </div>

      <input
        placeholder="Search term or translation…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 14 }}
      />

      {loading ? (
        <p className="muted">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            No words here yet.
          </p>
        </div>
      ) : (
        <div>
          {shown.map((w) => (
            <div key={w.term} className="list-item">
              <div>
                <span style={{ fontWeight: 700, fontSize: 17 }}>
                  {w.display}
                </span>
                {w.translation && (
                  <span className="muted"> — {w.translation}</span>
                )}
                {w.notes && (
                  <div className="muted" style={{ fontSize: 12 }}>
                    {w.notes}
                  </div>
                )}
              </div>
              <span className="badge">{STATUS_LABELS[w.status]}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
