"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscoveredItem } from "@/lib/ai";

const DEFAULT_LANG = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE ?? "es";

export default function DiscoverPage() {
  const router = useRouter();
  const [language, setLanguage] = useState(DEFAULT_LANG);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<DiscoveredItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((d) => setAiOn(Boolean(d.configured)))
      .catch(() => setAiOn(false));
  }, []);

  const find = async () => {
    setBusy(true);
    setError(null);
    setItems([]);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, topic: topic || undefined }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong.");
      else setItems(data.items ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const read = async (item: DiscoveredItem) => {
    setAdding(item.url);
    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          text: item.excerpt,
          language,
          source: item.url,
        }),
      });
      const lesson = await res.json();
      router.push(`/read/${lesson.id}`);
    } finally {
      setAdding(null);
    }
  };

  return (
    <main className="container">
      <div className="hero">
        <div className="badge" style={{ marginBottom: 10 }}>✨ Agentic</div>
        <h1>
          Find your <span className="gradtext">next read</span>
        </h1>
        <p className="muted" style={{ maxWidth: 560 }}>
          Lingo searches the live web for authentic content that reuses the words
          you&apos;re learning and stays at a level you can actually follow — then
          drops it straight into your reader.
        </p>
      </div>

      {aiOn === false && (
        <div className="card" style={{ borderColor: "var(--accent)", marginBottom: 16 }}>
          <strong>Discovery is off.</strong>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Set <code>ANTHROPIC_API_KEY</code> in your environment to enable web
            search.
          </p>
        </div>
      )}

      <div className="card">
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <div style={{ width: 110 }}>
            <span className="lbl">Language</span>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <span className="lbl">Topic (optional)</span>
            <input
              value={topic}
              placeholder="football, cooking, politics, sci-fi…"
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
        </div>
        <button
          className="primary"
          style={{ marginTop: 14 }}
          disabled={busy || aiOn === false}
          onClick={find}
        >
          {busy ? "Searching the web…" : "Find content for me"}
        </button>
      </div>

      {busy && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="row" style={{ gap: 10 }}>
            <div className="typing"><span /><span /><span /></div>
            <span className="muted">
              Reading the web for {language.toUpperCase()} content at your level…
            </span>
          </div>
        </div>
      )}

      {error && <p style={{ color: "var(--warn)", marginTop: 14 }}>{error}</p>}

      <div style={{ marginTop: 16 }}>
        {items.map((item) => (
          <div key={item.url} className="card" style={{ marginBottom: 14 }}>
            <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
              <h2 style={{ margin: 0 }}>{item.title}</h2>
              <a href={item.url} target="_blank" rel="noreferrer" className="badge">
                source ↗
              </a>
            </div>
            <p className="muted" style={{ margin: "8px 0" }}>{item.summary}</p>

            {item.matchedWords?.length > 0 && (
              <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {item.matchedWords.slice(0, 10).map((w) => (
                  <span key={w} className="chip active">{w}</span>
                ))}
              </div>
            )}

            <div
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                padding: "12px 14px",
                background: "rgba(10,10,20,0.4)",
                borderRadius: 12,
                border: "1px solid var(--border)",
              }}
            >
              {item.excerpt}
            </div>

            <div className="row between" style={{ marginTop: 12 }}>
              <span className="muted" style={{ fontSize: 12 }}>{item.levelNote}</span>
              <button
                className="primary"
                disabled={adding === item.url}
                onClick={() => read(item)}
              >
                {adding === item.url ? "Opening…" : "Read this →"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
