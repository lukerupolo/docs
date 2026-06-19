import { NextRequest, NextResponse } from "next/server";
import { aiConfigured, debate, DebateTurn } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST { language, title, article, vocab: string[], history: DebateTurn[] }
// history must already include the learner's latest message as its last turn.
export async function POST(req: NextRequest) {
  if (!aiConfigured()) {
    return NextResponse.json(
      {
        error:
          "AI debate is not enabled. Set ANTHROPIC_API_KEY in the environment to turn it on.",
        configured: false,
      },
      { status: 503 }
    );
  }

  const body = await req.json();
  const history: DebateTurn[] = Array.isArray(body?.history) ? body.history : [];

  try {
    const result = await debate({
      language: body?.language ?? "es",
      title: body?.title ?? "the article",
      article: typeof body?.article === "string" ? body.article : "",
      vocab: Array.isArray(body?.vocab) ? body.vocab : [],
      history,
      phase: body?.phase === "retell" ? "retell" : "debate",
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
