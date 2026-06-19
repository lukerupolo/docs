import { NextRequest, NextResponse } from "next/server";
import { aiConfigured, checkGrammar } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST { text, language?, mode?: "grammar" }
// Returns AI grammar feedback. Requires ANTHROPIC_API_KEY; otherwise 503 with a
// clear message so the UI can explain how to enable it.
export async function POST(req: NextRequest) {
  if (!aiConfigured()) {
    return NextResponse.json(
      {
        error:
          "AI feedback is not enabled. Set ANTHROPIC_API_KEY in the environment to turn it on.",
        configured: false,
      },
      { status: 503 }
    );
  }

  const body = await req.json();
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const feedback = await checkGrammar({
      text,
      language: body?.language ?? "es",
    });
    return NextResponse.json(feedback);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({ configured: aiConfigured() });
}
