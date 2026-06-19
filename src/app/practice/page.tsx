"use client";

import { useEffect, useState } from "react";
import type { GrammarFeedback } from "@/lib/ai";

const DEFAULT_LANG = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE ?? "es";

export default function PracticePage() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState(DEFAULT_LANG);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<GrammarFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiOn, setAiOn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((d) => setAiOn(Boolean(d.configured)))
      .catch(() => setAiOn(false));
  }, []);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, mode: "grammar" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setFeedback(data as GrammarFeedback);
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container">
      <h1>Grammar practice</h1>
      <p className="muted">
        Write a sentence in your target language. Get it corrected with
        explanations — great for using the words you&apos;re learning in real
        sentences.
      </p>

      {aiOn === false && (
        <div
          className="card"
          style={{ borderColor: "var(--accent)", marginBottom: 14 }}
        >
          <strong>AI feedback is off.</strong>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Set <code>ANTHROPIC_API_KEY</code> in your environment (e.g. Vercel
            project settings) to enable corrections.
          </p>
        </div>
      )}

      <div className="card">
        <label className="field">
          <span className="lbl">Language code</span>
          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ maxWidth: 120 }}
          />
        </label>
        <label className="field">
          <span className="lbl">Your sentence</span>
          <textarea
            value={text}
            placeholder="Escribe una frase aquí…"
            onChange={(e) => setText(e.target.value)}
            style={{ minHeight: 110 }}
          />
        </label>
        <button
          className="primary"
          disabled={busy || aiOn === false}
          onClick={submit}
        >
          {busy ? "Checking…" : "Check my grammar"}
        </button>
      </div>

      {error && (
        <p style={{ color: "#ff8a8a", marginTop: 14 }}>{error}</p>
      )}

      {feedback && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="row between">
            <h2 style={{ margin: 0 }}>Feedback</h2>
            <span className="badge">{feedback.rating}/100</span>
          </div>

          <div style={{ margin: "12px 0" }}>
            <div className="lbl muted" style={{ fontSize: 13 }}>
              Corrected
            </div>
            <div style={{ fontSize: 18 }}>{feedback.corrected}</div>
          </div>

          {feedback.issues.length === 0 ? (
            <p style={{ color: "var(--accent-2)" }}>
              No mistakes found. {feedback.encouragement}
            </p>
          ) : (
            <>
              {feedback.issues.map((iss, i) => (
                <div key={i} className="list-item" style={{ display: "block" }}>
                  <div>
                    <span
                      style={{
                        textDecoration: "line-through",
                        color: "#ff8a8a",
                      }}
                    >
                      {iss.excerpt}
                    </span>{" "}
                    →{" "}
                    <span style={{ color: "var(--accent-2)" }}>
                      {iss.correction}
                    </span>
                    <span className="badge" style={{ marginLeft: 8 }}>
                      {iss.type}
                    </span>
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    {iss.explanation}
                  </div>
                </div>
              ))}
              <p className="muted" style={{ marginBottom: 0 }}>
                {feedback.encouragement}
              </p>
            </>
          )}
        </div>
      )}
    </main>
  );
}
