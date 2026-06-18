import { NextRequest, NextResponse } from "next/server";
import { listWords, upsertWord } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const language = req.nextUrl.searchParams.get("language") ?? undefined;
  return NextResponse.json(await listWords(language));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.term || typeof body.term !== "string") {
    return NextResponse.json({ error: "term is required" }, { status: 400 });
  }
  const word = await upsertWord({
    term: body.term,
    display: body.display,
    language: body.language,
    status: body.status,
    translation: body.translation,
    notes: body.notes,
    tags: body.tags,
  });
  return NextResponse.json(word);
}
