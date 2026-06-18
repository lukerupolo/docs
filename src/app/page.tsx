import Link from "next/link";
import { getStats, listLessons } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [lessons, stats] = await Promise.all([listLessons(), getStats()]);

  return (
    <main className="container">
      <h1>Library</h1>
      <p className="muted">
        Read texts, click words to save them, and review with spaced repetition.
      </p>

      <div className="grid cols-4" style={{ margin: "20px 0" }}>
        <div className="card stat">
          <div className="num">{stats.known}</div>
          <div className="label">Known</div>
        </div>
        <div className="card stat">
          <div className="num">{stats.learning}</div>
          <div className="label">Learning</div>
        </div>
        <div className="card stat">
          <div className="num">{stats.totalTracked}</div>
          <div className="label">Total words</div>
        </div>
        <Link href="/review" className="card stat" style={{ display: "block" }}>
          <div className="num" style={{ color: "var(--accent-2)" }}>
            {stats.dueForReview}
          </div>
          <div className="label">Due to review</div>
        </Link>
      </div>

      <div className="row between" style={{ marginBottom: 12 }}>
        <h2>Lessons</h2>
        <Link href="/import" className="btn primary">
          + New lesson
        </Link>
      </div>

      {lessons.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            No lessons yet. Head to{" "}
            <Link href="/import">Import</Link> to paste your first text.
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
