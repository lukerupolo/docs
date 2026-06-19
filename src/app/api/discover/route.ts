import { NextRequest, NextResponse } from "next/server";
import { aiConfigured, discoverContent } from "@/lib/ai";
import { listWords } from "@/lib/data";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST { language?, topic? }
// Reads the learner's saved vocabulary to build a profile, then has Claude
// search the live web for authentic content at the right level.
export async function POST(req: NextRequest) {
  if (!aiConfigured()) {
    return NextResponse.json(
      {
        error:
          "Discovery needs the Claude API. Set ANTHROPIC_API_KEY in the environment to turn it on.",
        configured: false,
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const language = body?.language ?? "es";
  const topic = typeof body?.topic === "string" ? body.topic : undefined;

  const words = await listWords(language);
  const learning = words
    .filter((w) => w.status >= 1 && w.status <= 4)
    .map((w) => w.display);
  const known = words.filter((w) => w.status === 5).map((w) => w.display);

  try {
    const items = await discoverContent({ language, known, learning, topic });
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Discovery failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
