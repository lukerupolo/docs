import { notFound } from "next/navigation";
import Link from "next/link";
import { getLesson, getStatuses } from "@/lib/data";
import { tokenize, uniqueTerms } from "@/lib/tokenize";
import Reader from "@/components/Reader";

export const dynamic = "force-dynamic";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await getLesson(id);
  if (!lesson) notFound();

  const tokens = tokenize(lesson.text);
  const statuses = await getStatuses(uniqueTerms(lesson.text), lesson.language);

  return (
    <main className="container">
      <div className="row between" style={{ marginBottom: 8 }}>
        <Link href="/" className="muted">
          ← Library
        </Link>
        <span className="muted" style={{ fontSize: 13 }}>
          {lesson.language.toUpperCase()} · {lesson.wordCount} words
        </span>
      </div>
      <h1 style={{ marginTop: 0 }}>{lesson.title}</h1>
      <Reader
        lessonId={lesson.id}
        language={lesson.language}
        tokens={tokens}
        initialStatuses={statuses}
      />
    </main>
  );
}
