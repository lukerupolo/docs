import { NextRequest, NextResponse } from "next/server";
import { getStatuses } from "@/lib/data";

export const dynamic = "force-dynamic";

// POST { terms: string[], language?: string } -> { term: status }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const terms: string[] = Array.isArray(body?.terms) ? body.terms : [];
  return NextResponse.json(await getStatuses(terms, body?.language));
}
