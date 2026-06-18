import { NextRequest, NextResponse } from "next/server";
import { importWords } from "@/lib/data";

export const dynamic = "force-dynamic";

// Bulk import endpoint — used to ingest a vocabulary list.
// Accepts either:
//   { language?, overwrite?, entries: [{ term, translation?, status?, notes?, tags? }] }
// or a plain array of entries in the body.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const entries = Array.isArray(body) ? body : body?.entries;
  if (!Array.isArray(entries)) {
    return NextResponse.json(
      { error: "entries array is required" },
      { status: 400 }
    );
  }
  const result = await importWords(
    entries,
    Array.isArray(body) ? undefined : body?.language,
    Array.isArray(body) ? false : Boolean(body?.overwrite)
  );
  return NextResponse.json(result);
}
