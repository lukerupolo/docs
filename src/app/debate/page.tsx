"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DebateResponse } from "@/lib/ai";
import type { Lesson, Word } from "@/lib/types";
import { normalize, uniqueTerms } from "@/lib/tokenize";

type Phase = "retell" | "debate";

interface DisplayTurn {
  role: "user" | "assistant";
  content: string;
  meta?: DebateResponse;
}

export default function DebatePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [vocab, setVocab] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("retell");
  const [turns, setTurns] = useState<DisplayTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((d) => setAiOn(Boolean(d.configured)))
      .catch(() => setAiOn(false));
    fetch("/api/lessons")
      .then((r) => r.json())
      .then((ls: Lesson[]) => {
        setLessons(ls);
        const id = new URLSearchParams(window.location.search).get("lesson");
        const l = id ? ls.find((x) => x.id === id) : null;
        if (l) pick(l);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  const usedSoFar = useMemo(() => {
    const s = new Set<string>();
    for (const t of turns)
      if (t.role === "assistant" && t.meta)
        for (const w of t.meta.usedTargetWords) s.add(normalize(w));
    return s;
  }, [turns]);

  const callDebate = useCallback(
    async (l: Lesson, voc: string[], history: DisplayTurn[], ph: Phase) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/debate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: l.language,
            title: l.title,
            article: l.text,
            vocab: voc,
            phase: ph,
            history: history.map((t) => ({ role: t.role, content: t.content })),
          }),
        });
        const data = await res.json();
        if (!res.ok) return setError(data.error ?? "Something went wrong.");
        setTurns((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, meta: data as DebateResponse },
        ]);
      } catch {
        setError("Network error.");
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const pick = useCallback(
    async (l: Lesson, ph: Phase = "retell") => {
      setTurns([]);
      setError(null);
      setPhase(ph);
      const [full, words]: [Lesson, Word[]] = await Promise.all([
        fetch(`/api/lessons/${l.id}`).then((r) => r.json()),
        fetch(`/api/words?language=${encodeURIComponent(l.language)}`).then((r) => r.json()),
      ]);
      setLesson(full);

      const status: Record<string, { status: number; display: string }> = {};
      for (const w of words) status[w.term] = { status: w.status, display: w.display };
      const learning: string[] = [];
      const known: string[] = [];
      for (const term of uniqueTerms(full.text)) {
        const s = status[term];
        if (!s) continue;
        if (s.status >= 1 && s.status <= 4) learning.push(s.display);
        else if (s.status === 5) known.push(s.display);
      }
      const voc = [...learning.slice(0, 10), ...known.slice(0, 4)];
      setVocab(voc);
      await callDebate(full, voc, [], ph);
    },
    [callDebate]
  );

  const switchPhase = (ph: Phase) => {
    if (!lesson || ph === phase) return;
    setPhase(ph);
    setTurns([]);
    callDebate(lesson, vocab, [], ph);
  };

  const send = async () => {
    if (!input.trim() || !lesson || busy) return;
    const next = [...turns, { role: "user" as const, content: input.trim() }];
    setTurns(next);
    setInput("");
    await callDebate(lesson, vocab, next, phase);
  };

  // ---------- picker ----------
  if (!lesson) {
    return (
      <main className="container">
        <div className="hero">
          <div className="badge" style={{ marginBottom: 10 }}>🎙️ Agentic</div>
          <h1>
            Argue it out in <span className="gradtext">your target language</span>
          </h1>
          <p className="muted" style={{ maxWidth: 560 }}>
            A partner that&apos;s read your article. First you retell it, then you
            debate — it pushes back, bait you into complex sentences, steers you
            toward your words, and recasts your slips on the fly.
          </p>
        </div>
        {aiOn === false && <AiOffNote what="debate" />}
        <h2 style={{ marginTop: 8 }}>Pick something to debate</h2>
        {lessons.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              No lessons yet — import or discover one first.
            </p>
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            {lessons.map((l) => (
              <div
                key={l.id}
                className="list-item"
                style={{ cursor: "pointer" }}
                onClick={() => pick(l)}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{l.title}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {l.language.toUpperCase()} · {l.wordCount} words
                  </div>
                </div>
                <span className="badge">Talk →</span>
              </div>
            ))}
          </div>
        )}
      </main>
    );
  }

  // ---------- chat ----------
  const pct = vocab.length ? Math.round((usedSoFar.size / vocab.length) * 100) : 0;
  return (
    <main className="container">
      <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ marginBottom: 0, fontSize: 24 }}>{lesson.title}</h1>
        <button className="ghost" onClick={() => setLesson(null)}>← Change</button>
      </div>

      <div className="row" style={{ marginTop: 12, marginBottom: 12 }}>
        <div className="seg">
          <button className={phase === "retell" ? "on" : ""} onClick={() => switchPhase("retell")}>
            1 · Warm-up retell
          </button>
          <button className={phase === "debate" ? "on" : ""} onClick={() => switchPhase("debate")}>
            2 · Live debate
          </button>
        </div>
      </div>

      {vocab.length > 0 && (
        <div className="quest" style={{ marginBottom: 12 }}>
          <div className="row between">
            <span className="lbl" style={{ margin: 0 }}>
              Use your words — {usedSoFar.size}/{vocab.length}
            </span>
            <span className="muted" style={{ fontSize: 12 }}>{pct}%</span>
          </div>
          <div className="bar"><i style={{ width: `${pct}%` }} /></div>
          <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {vocab.map((w) => (
              <span key={w} className={`chip ${usedSoFar.has(normalize(w)) ? "active" : ""}`}>
                {usedSoFar.has(normalize(w)) ? "✓ " : ""}{w}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="chat">
        {turns.map((t, i) => (
          <div key={i} className={`bubble ${t.role}`}>
            <div className="who">{t.role === "user" ? "You" : "Partner"}</div>
            <div>{t.content}</div>
            {t.meta && t.meta.correction.hasIssue && (
              <div className="recast">
                <span style={{ textDecoration: "line-through", color: "var(--warn)" }}>
                  {t.meta.correction.original}
                </span>{" "}
                → <span style={{ color: "var(--accent-2)" }}>{t.meta.correction.recast}</span>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {t.meta.correction.note}
                </div>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="typing"><span /><span /><span /></div>}
        {error && <p style={{ color: "var(--warn)" }}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        <input
          value={input}
          placeholder={`Reply in ${lesson.language.toUpperCase()}…`}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={busy}
        />
        <button className="primary" onClick={send} disabled={busy || !input.trim()}>
          Send
        </button>
      </div>
    </main>
  );
}

function AiOffNote({ what }: { what: string }) {
  return (
    <div className="card" style={{ borderColor: "var(--accent)", marginBottom: 14 }}>
      <strong>AI {what} is off.</strong>
      <p className="muted" style={{ margin: "6px 0 0" }}>
        Set <code>ANTHROPIC_API_KEY</code> in your environment to enable it.
      </p>
    </div>
  );
}
