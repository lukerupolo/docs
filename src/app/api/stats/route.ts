import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const language = req.nextUrl.searchParams.get("language") ?? undefined;
  return NextResponse.json(await getStats(language));
}
