"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Word } from "@/lib/types";
import { normalize } from "@/lib/tokenize";

type Grade = "again" | "good" | "easy";
type Mode = "recognition" | "recall";

export default function ReviewPage() {
  const [mode, setMode] = useState<Mode>("recognition");
  const [includeKnown, setIncludeKnown] = useState(false);
  const [queue, setQueue] = useState<Word[]>([]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(0);

  // recall-mode answer state
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setI(0);
    setDone(0);
    setRevealed(false);
    setChecked(false);
    setAnswer("");
    const due: Word[] = await fetch("/api/review?limit=50").then((r) => r.json());
    let items = due;
    if (includeKnown) {
      const all: Word[] = await fetch("/api/words").then((r) => r.json());
      const known = all.filter((w) => w.status === 5);
      // shuffle known and take up to 20
      for (let k = known.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [known[k], known[j]] = [known[j], known[k]];
      }
      items = [...due, ...known.slice(0, 20)];
    }
    setQueue(items);
    setLoading(false);
  }, [includeKnown]);

  useEffect(() => {
    load();
  }, [load]);

  const card = queue[i];

  const advance = () => {
    setRevealed(false);
    setChecked(false);
    setAnswer("");
    setI((x) => x + 1);
    setDone((d) => d + 1);
  };

  const grade = async (g: Grade) => {
    if (!card) return;
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: card.term, grade: g, language: card.language }),
    });
    advance();
  };

  const correct = useMemo(() => {
    if (!card) return false;
    return normalize(answer.trim()) === card.term;
  }, [answer, card]);

  if (loading) {
    return (
      <main className="container">
        <h1>Review</h1>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ marginBottom: 0 }}>Review</h1>
        {card && (
          <span className="muted">
            {i + 1} / {queue.length}
          </span>
        )}
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap", margin: "12px 0 18px" }}>
        <span
          className={`chip ${mode === "recognition" ? "active" : ""}`}
          onClick={() => setMode("recognition")}
        >
          Recognition (see word)
        </span>
        <span
          className={`chip ${mode === "recall" ? "active" : ""}`}
          onClick={() => setMode("recall")}
        >
          Active recall (produce word)
        </span>
        <span
          className={`chip ${includeKnown ? "active" : ""}`}
          onClick={() => setIncludeKnown((v) => !v)}
        >
          {includeKnown ? "✓ " : ""}Include known
        </span>
      </div>

      {!card ? (
        <div className="card">
          <p style={{ margin: 0 }}>
            {done > 0
              ? `Nice — ${done} cards reviewed. Nothing left in this set.`
              : "Nothing due right now. Read more and save words, or turn on “Include known” to drill words you already know."}
          </p>
        </div>
      ) : mode === "recognition" ? (
        // ---- Recognition: show the word, recall its meaning ----
        <>
          <div
            className="card"
            style={{ textAlign: "center", padding: "48px 24px" }}
          >
            <div style={{ fontSize: 34, fontWeight: 800 }}>{card.display}</div>
            {revealed ? (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 20 }}>
                  {card.translation || (
                    <span className="muted">(no translation saved)</span>
                  )}
                </div>
                {card.notes && (
                  <div className="muted" style={{ marginTop: 8 }}>
                    {card.notes}
                  </div>
                )}
              </div>
            ) : (
              <button
                className="primary"
                style={{ marginTop: 24 }}
                onClick={() => setRevealed(true)}
              >
                Show answer
              </button>
            )}
          </div>
          {revealed && <GradeButtons onGrade={grade} />}
        </>
      ) : (
        // ---- Active recall: show the meaning, produce the word ----
        <>
          <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <div className="muted" style={{ fontSize: 13 }}>
              Recall the word or phrase for:
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, margin: "8px 0 18px" }}>
              {card.translation || (
                <span className="muted">(no hint — try anyway)</span>
              )}
            </div>
            <input
              autoFocus
              value={answer}
              placeholder="type it here…"
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !checked) setChecked(true);
              }}
              style={{ maxWidth: 360, margin: "0 auto", textAlign: "center" }}
              disabled={checked}
            />
            {checked && (
              <div style={{ marginTop: 16 }}>
                {correct ? (
                  <div style={{ color: "var(--accent-2)", fontWeight: 700 }}>
                    ✓ Correct — {card.display}
                  </div>
                ) : (
                  <div style={{ color: "#ff8a8a", fontWeight: 700 }}>
                    Answer: {card.display}
                  </div>
                )}
              </div>
            )}
            {!checked && (
              <button
                className="primary"
                style={{ marginTop: 18 }}
                onClick={() => setChecked(true)}
              >
                Check
              </button>
            )}
          </div>
          {checked && (
            <GradeButtons
              onGrade={grade}
              suggest={correct ? "good" : "again"}
            />
          )}
        </>
      )}
    </main>
  );
}

function GradeButtons({
  onGrade,
  suggest,
}: {
  onGrade: (g: Grade) => void;
  suggest?: Grade;
}) {
  return (
    <div
      className="row"
      style={{ gap: 10, marginTop: 16, justifyContent: "center" }}
    >
      <button
        className={suggest === "again" ? "primary" : ""}
        onClick={() => onGrade("again")}
      >
        Again
      </button>
      <button
        className={suggest === "good" ? "primary" : ""}
        onClick={() => onGrade("good")}
      >
        Good
      </button>
      <button
        className={suggest === "easy" ? "primary" : ""}
        onClick={() => onGrade("easy")}
      >
        Easy
      </button>
    </div>
  );
}
