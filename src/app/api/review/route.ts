import { NextRequest, NextResponse } from "next/server";
import { getDueWords, reviewWord } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET ?language=&limit= -> due words for review
export async function GET(req: NextRequest) {
  const language = req.nextUrl.searchParams.get("language") ?? undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  return NextResponse.json(await getDueWords(language, limit));
}

// POST { term, grade: "again"|"good"|"easy", language? }
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.term || !body?.grade) {
    return NextResponse.json(
      { error: "term and grade are required" },
      { status: 400 }
    );
  }
  const word = await reviewWord(body.term, body.grade, body.language);
  if (!word) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(word);
}
