import { NextRequest, NextResponse } from "next/server";
import { createLesson, listLessons } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listLessons());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body?.text || typeof body.text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  const lesson = await createLesson({
    title: body.title ?? "Untitled",
    text: body.text,
    language: body.language,
    source: body.source,
  });
  return NextResponse.json(lesson, { status: 201 });
}
