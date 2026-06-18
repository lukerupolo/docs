"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_LANG =
  process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE ?? "es";

export default function ImportPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"lesson" | "words">("lesson");

  // lesson form
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [language, setLanguage] = useState(DEFAULT_LANG);
  const [busy, setBusy] = useState(false);

  // words form
  const [wordsText, setWordsText] = useState("");
  const [wordsLang, setWordsLang] = useState(DEFAULT_LANG);
  const [result, setResult] = useState<string | null>(null);

  const submitLesson = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, text, language }),
      });
      const lesson = await res.json();
      router.push(`/read/${lesson.id}`);
    } finally {
      setBusy(false);
    }
  };

  // Parse "term, translation" or "term\ttranslation" per line.
  const submitWords = async () => {
    const entries = wordsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/\t|,|;|=>|—|–|\|/);
        const term = parts[0]?.trim();
        const translation = parts.slice(1).join(", ").trim() || undefined;
        return { term, translation };
      })
      .filter((e) => e.term);
    if (entries.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/words/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: wordsLang, entries }),
      });
      const r = await res.json();
      setResult(
        `Imported: ${r.added} added, ${r.updated} updated, ${r.skipped} skipped.`
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container">
      <h1>Import</h1>

      <div className="row" style={{ gap: 8, margin: "8px 0 18px" }}>
        <span
          className={`chip ${tab === "lesson" ? "active" : ""}`}
          onClick={() => setTab("lesson")}
        >
          New lesson
        </span>
        <span
          className={`chip ${tab === "words" ? "active" : ""}`}
          onClick={() => setTab("words")}
        >
          Word list
        </span>
      </div>

      {tab === "lesson" ? (
        <div className="card">
          <label className="field">
            <span className="lbl">Title</span>
            <input
              value={title}
              placeholder="e.g. El Principito — Chapter 1"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="lbl">Language code</span>
            <input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ maxWidth: 120 }}
            />
          </label>
          <label className="field">
            <span className="lbl">Text</span>
            <textarea
              value={text}
              placeholder="Paste the text you want to read…"
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy} onClick={submitLesson}>
            {busy ? "Creating…" : "Create lesson & read"}
          </button>
        </div>
      ) : (
        <div className="card">
          <p className="muted" style={{ marginTop: 0 }}>
            One word per line. Optionally add a translation after a comma, tab,
            or <code>=&gt;</code>. New words start at Learning&nbsp;1.
          </p>
          <label className="field">
            <span className="lbl">Language code</span>
            <input
              value={wordsLang}
              onChange={(e) => setWordsLang(e.target.value)}
              style={{ maxWidth: 120 }}
            />
          </label>
          <label className="field">
            <span className="lbl">Words</span>
            <textarea
              value={wordsText}
              placeholder={"hola, hello\ncasa, house\nperro => dog"}
              onChange={(e) => setWordsText(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy} onClick={submitWords}>
            {busy ? "Importing…" : "Import words"}
          </button>
          {result && (
            <p style={{ color: "var(--accent-2)", marginBottom: 0 }}>{result}</p>
          )}
        </div>
      )}
    </main>
  );
}
