import Link from "next/link";
import { getStats, listLessons } from "@/lib/data";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    href: "/discover",
    emoji: "✨",
    title: "Discover",
    body: "Let Lingo search the web for authentic content at your exact level.",
  },
  {
    href: "/debate",
    emoji: "🎙️",
    title: "Debate",
    body: "Argue about what you read with an AI partner that pushes back.",
  },
  {
    href: "/practice",
    emoji: "✍️",
    title: "Write",
    body: "Compose in your target language and get instant, kind corrections.",
  },
];

export default async function Home() {
  const [lessons, stats] = await Promise.all([listLessons(), getStats()]);

  return (
    <main className="container">
      <div className="hero">
        <h1>
          Read, argue, <span className="gradtext">acquire</span>.
        </h1>
        <p className="muted" style={{ maxWidth: 560, marginBottom: 0 }}>
          Comprehensible input that finds itself, and an AI partner to push your
          speaking and writing. Read real content, mine the words you don&apos;t
          know, then put them to work.
        </p>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 22 }}>
        <div className="card stat">
          <div className="num">{stats.known}</div>
          <div className="label">Known words</div>
        </div>
        <div className="card stat">
          <div className="num">{stats.learning}</div>
          <div className="label">Learning</div>
        </div>
        <div className="card stat">
          <div className="num">{stats.totalTracked}</div>
          <div className="label">Total mined</div>
        </div>
        <div className="card stat">
          <div className="num">{stats.lessons}</div>
          <div className="label">Lessons</div>
        </div>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 26 }}>
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="card"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={{ fontSize: 26 }}>{f.emoji}</div>
            <div style={{ fontWeight: 800, fontSize: 18, margin: "6px 0 4px" }}>
              {f.title}
            </div>
            <div className="muted" style={{ fontSize: 14 }}>{f.body}</div>
          </Link>
        ))}
      </div>

      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Your library</h2>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/discover" className="btn">✨ Discover</Link>
          <Link href="/import" className="btn primary">+ New</Link>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Nothing here yet. Try <Link href="/discover">Discover</Link> to find
            something to read, or <Link href="/import">paste your own text</Link>.
          </p>
        </div>
      ) : (
        <div>
          {lessons.map((l) => {
            const pct =
              l.wordCount > 0
                ? Math.min(100, Math.round((l.progress / l.wordCount) * 100))
                : 0;
            return (
              <Link
                key={l.id}
                href={`/read/${l.id}`}
                className="list-item"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{l.title}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {l.language.toUpperCase()} · {l.wordCount} words · {pct}% read
                  </div>
                </div>
                <span className="badge">Read →</span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
