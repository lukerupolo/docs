"use client";

import { useEffect, useState } from "react";
import { Word } from "@/lib/types";

type Grade = "again" | "good" | "easy";

export default function ReviewPage() {
  const [queue, setQueue] = useState<Word[]>([]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(0);

  useEffect(() => {
    fetch("/api/review?limit=50")
      .then((r) => r.json())
      .then((w: Word[]) => setQueue(w))
      .finally(() => setLoading(false));
  }, []);

  const card = queue[i];

  const grade = async (g: Grade) => {
    if (!card) return;
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: card.term, grade: g, language: card.language }),
    });
    setDone((d) => d + 1);
    setRevealed(false);
    setI((x) => x + 1);
  };

  if (loading) {
    return (
      <main className="container">
        <h1>Review</h1>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="container">
        <h1>Review</h1>
        <div className="card">
          <p style={{ margin: 0 }}>
            {done > 0
              ? `Nice — ${done} cards reviewed. Nothing left due.`
              : "Nothing due for review right now. Read more and save words!"}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="row between">
        <h1 style={{ marginBottom: 0 }}>Review</h1>
        <span className="muted">
          {i + 1} / {queue.length}
        </span>
      </div>

      <div
        className="card"
        style={{ textAlign: "center", padding: "48px 24px", marginTop: 16 }}
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

      {revealed && (
        <div className="row" style={{ gap: 10, marginTop: 16, justifyContent: "center" }}>
          <button onClick={() => grade("again")}>Again</button>
          <button onClick={() => grade("good")}>Good</button>
          <button className="primary" onClick={() => grade("easy")}>
            Easy
          </button>
        </div>
      )}
    </main>
  );
}
