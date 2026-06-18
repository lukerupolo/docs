"use client";

import { useEffect, useState } from "react";
import { STATUS_LABELS, WordStatus } from "@/lib/types";

interface Props {
  term: string;
  display: string;
  language: string;
  status?: WordStatus;
  anchor: { x: number; y: number };
  onClose: () => void;
  onSaved: (term: string, status: WordStatus) => void;
}

const STATUS_OPTIONS: WordStatus[] = [1, 2, 3, 4, 5, -1];

export default function WordPopup({
  term,
  display,
  language,
  status,
  anchor,
  onClose,
  onSaved,
}: Props) {
  const [translation, setTranslation] = useState("");
  const [notes, setNotes] = useState("");
  const [current, setCurrent] = useState<WordStatus>(status ?? 0);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load any saved data for this word.
  useEffect(() => {
    let alive = true;
    fetch(`/api/words?language=${encodeURIComponent(language)}`)
      .then((r) => r.json())
      .then((words: Array<{ term: string; translation?: string; notes?: string; status: WordStatus }>) => {
        if (!alive) return;
        const w = words.find((x) => x.term === term);
        if (w) {
          setTranslation(w.translation ?? "");
          setNotes(w.notes ?? "");
          setCurrent(w.status);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      alive = false;
    };
  }, [term, language]);

  const save = async (status: WordStatus) => {
    setSaving(true);
    setCurrent(status);
    try {
      await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term,
          display,
          language,
          status,
          translation: translation || undefined,
          notes: notes || undefined,
        }),
      });
      onSaved(term, status);
    } finally {
      setSaving(false);
    }
  };

  // Keep popup on-screen.
  const left = Math.min(anchor.x, (typeof window !== "undefined" ? window.innerWidth : 1000) - 340);
  const top = anchor.y;

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 50 }}
        onClick={onClose}
      />
      <div className="popup" style={{ left, top }}>
        <div className="row between">
          <span className="term">{display}</span>
          <span className="badge">{STATUS_LABELS[current]}</span>
        </div>

        <div className="statusrow">
          {STATUS_OPTIONS.map((s) => (
            <span
              key={s}
              className={`chip ${current === s ? "active" : ""}`}
              onClick={() => save(s)}
            >
              {s === -1 ? "Ignore" : s === 5 ? "Known" : `L${s}`}
            </span>
          ))}
        </div>

        <label className="field">
          <span className="lbl">Translation / hint</span>
          <input
            value={translation}
            placeholder={loaded ? "meaning…" : "loading…"}
            onChange={(e) => setTranslation(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="lbl">Notes</span>
          <input
            value={notes}
            placeholder="example, gender, conjugation…"
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="row between">
          <button className="ghost" onClick={onClose}>
            Close
          </button>
          <button
            className="primary"
            disabled={saving}
            onClick={() => save(current || 1)}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}
