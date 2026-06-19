import Anthropic from "@anthropic-ai/sdk";

// Thin wrapper around the Claude API for language-feedback features.
// Everything here is gated on ANTHROPIC_API_KEY so the app still runs (and the
// rest of the features work) when no key is configured.

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const MODEL = "claude-opus-4-8";

const LANG_NAMES: Record<string, string> = {
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  en: "English",
};

export function languageName(code: string): string {
  return LANG_NAMES[code.toLowerCase()] ?? code;
}

export interface GrammarIssue {
  excerpt: string; // the problematic span from the user's text
  correction: string; // the fixed version of that span
  explanation: string; // why, in English, kept short
  type: string; // e.g. "agreement", "conjugation", "word order", "spelling"
}

export interface GrammarFeedback {
  corrected: string; // full corrected sentence
  issues: GrammarIssue[];
  rating: number; // 0..100 overall correctness
  encouragement: string; // one short friendly line in English
}

const GRAMMAR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    corrected: { type: "string" },
    rating: { type: "integer" },
    encouragement: { type: "string" },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          excerpt: { type: "string" },
          correction: { type: "string" },
          explanation: { type: "string" },
          type: { type: "string" },
        },
        required: ["excerpt", "correction", "explanation", "type"],
      },
    },
  },
  required: ["corrected", "rating", "encouragement", "issues"],
} as const;

// Check a learner's sentence for grammar/spelling and return structured feedback.
export async function checkGrammar(input: {
  text: string;
  language: string;
}): Promise<GrammarFeedback> {
  const lang = languageName(input.language);
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1500,
    output_config: { format: { type: "json_schema", schema: GRAMMAR_SCHEMA } },
    system: `You are a patient ${lang} tutor. The user is a language learner writing in ${lang}. Identify grammar, agreement, conjugation, word-order, and spelling mistakes. Be encouraging and concise. If the sentence is already correct, return it unchanged with an empty issues array and a high rating. Explanations must be in English so the learner understands.`,
    messages: [
      {
        role: "user",
        content: `Here is my ${lang} sentence. Correct it and explain any mistakes:\n\n${input.text}`,
      },
    ],
  });
  const block = res.content.find((b) => b.type === "text");
  const text = block && block.type === "text" ? block.text : "{}";
  return JSON.parse(text) as GrammarFeedback;
}

// ---------- Debate / speaking-recall partner ----------

export interface DebateTurn {
  role: "user" | "assistant";
  content: string;
}

export interface DebateResponse {
  reply: string; // in the target language — keeps the debate going
  correction: {
    hasIssue: boolean;
    original: string; // the learner's phrase that needed fixing
    recast: string; // natural corrected version
    note: string; // short English explanation
  };
  usedTargetWords: string[]; // target words the learner just used
  suggestedWords: string[]; // target words to try next
}

const DEBATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    correction: {
      type: "object",
      additionalProperties: false,
      properties: {
        hasIssue: { type: "boolean" },
        original: { type: "string" },
        recast: { type: "string" },
        note: { type: "string" },
      },
      required: ["hasIssue", "original", "recast", "note"],
    },
    usedTargetWords: { type: "array", items: { type: "string" } },
    suggestedWords: { type: "array", items: { type: "string" } },
  },
  required: ["reply", "correction", "usedTargetWords", "suggestedWords"],
} as const;

export async function debate(input: {
  language: string;
  title: string;
  article: string;
  vocab: string[];
  history: DebateTurn[];
  phase?: "retell" | "debate";
}): Promise<DebateResponse> {
  const lang = languageName(input.language);
  const article = input.article.slice(0, 4000);
  const vocab = input.vocab.slice(0, 16);
  const phase = input.phase ?? "debate";

  // Two gears (pushed output). Gear 1: solo retell — retrieval under mild
  // pressure. Gear 2: live debate — full real-time pressure, the actual goal.
  const phaseBrief =
    phase === "retell"
      ? `PHASE: WARM-UP RETELL. Get the learner to retell / summarise the content in their own words. Ask them to recount what happened or what the main argument was. Prompt for more detail; don't debate yet. Keep it supportive and low-pressure.`
      : `PHASE: LIVE DEBATE. Take a clear, even provocative stance and argue it. Push back on the learner's points, demand reasons, raise counter-examples, and keep escalating so they must defend a position. Arguing forces complex subordination — concessives (although/even if), conditionals (if/unless), causals (because/since), consecutives (so that) — actively bait the learner into using these structures.`;

  const system = `You are a sharp, engaging debate partner and conversation coach for a learner of ${lang}. You have read this text the learner is studying (a TV-show transcript or an article):

TITLE: ${input.title}
---
${article}
---

${phaseBrief}

This is meaning-focused speaking practice — the priority is keeping a real, lively conversation going, not drilling. Naturally steer the learner to reuse the words and constructions they are currently learning: ${vocab.join(", ") || "(none provided)"}.

Rules for your JSON response:
- "reply": write ENTIRELY in ${lang}, 2-4 sentences, vivid and natural but pitched so the learner can follow. Have personality — be warm, curious, a bit provocative in debate phase. Weave in some target words. ALWAYS end with a pointed question or challenge that pushes the learner toward a complex sentence (a reason, a condition, a concession).
- "correction": recast at most ONE issue from the learner's latest message — the most useful one for reaching higher-register, well-subordinated ${lang}. Set hasIssue=true with their "original" phrase, a natural "recast", and a short English "note". If their message is solid, hasIssue=false with empty strings. Never nag about trivia.
- "usedTargetWords": which target words the learner actually used in their latest message.
- "suggestedWords": 2-3 target words or constructions you'd like them to try next.`;

  const kickoff =
    phase === "retell"
      ? `Let's warm up. In ${lang}, ask me to retell "${input.title}" in my own words — what happened or what the main point was.`
      : `Let's begin the debate. In ${lang}, give a bold opening stance on "${input.title}" and challenge me to respond.`;
  const history =
    input.history.length > 0
      ? input.history
      : [{ role: "user" as const, content: kickoff }];

  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 900,
    output_config: { format: { type: "json_schema", schema: DEBATE_SCHEMA } },
    system,
    messages: history.map((t) => ({ role: t.role, content: t.content })),
  });
  const block = res.content.find((b) => b.type === "text");
  const text = block && block.type === "text" ? block.text : "{}";
  return JSON.parse(text) as DebateResponse;
}

// ---------- Agentic content discovery (web search) ----------

export interface DiscoveredItem {
  title: string;
  url: string;
  summary: string; // 1-2 sentences in English: what it is + why it fits
  excerpt: string; // real text from the source, in the target language
  levelNote: string; // how well it matches the learner's level
  matchedWords: string[]; // learning words it reuses
}

// Pull the JSON array out of a model response that may wrap it in prose or fences.
function extractJsonArray(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
  return JSON.parse(candidate.slice(start, end + 1));
}

// Use Claude with the server-side web_search + web_fetch tools to find authentic
// content in the target language that reuses the learner's vocabulary and stays
// at a comprehensible level (the "narrow input" idea).
export async function discoverContent(input: {
  language: string;
  known: string[]; // sample of known words
  learning: string[]; // words currently being learned (priority overlap)
  topic?: string;
}): Promise<DiscoveredItem[]> {
  const lang = languageName(input.language);
  const known = input.known.slice(0, 120);
  const learning = input.learning.slice(0, 60);

  const prompt = `I'm learning ${lang}. Find me 4 pieces of authentic, currently-online ${lang} content to read next.

Words I'm CURRENTLY LEARNING (prioritise content that reuses these): ${learning.join(", ") || "(none yet)"}

A sample of words I ALREADY KNOW: ${known.join(", ") || "(beginner)"}
${input.topic ? `\nI'm especially interested in: ${input.topic}` : ""}

Requirements:
- Each piece must be written in ${lang} (news articles, short stories, blog posts, essays, show recaps).
- Aim for ~90-98% of words being ones I'd know — comprehensible but with a few new words to mine.
- Favour pieces that reuse my current learning words.
- Use web_search and web_fetch to find and read real, working URLs.

When done, output ONLY a JSON array (no prose) where each item is:
{"title": string, "url": string, "summary": string (English, 1-2 sentences), "excerpt": string (200-600 chars of the ACTUAL ${lang} text from the page), "levelNote": string (English, how well it fits my level), "matchedWords": string[] (my learning words it reuses)}`;

  const tools = [
    { type: "web_search_20260209" as const, name: "web_search" },
    { type: "web_fetch_20260209" as const, name: "web_fetch" },
  ];

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: prompt },
  ];

  const client = getClient();
  let last: Anthropic.Message | null = null;
  for (let i = 0; i < 8; i++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: tools as any,
      messages,
    });
    last = res;
    if (res.stop_reason === "pause_turn") {
      // server-tool loop hit its iteration cap — resume by re-sending
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    break;
  }

  const texts =
    last?.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n") ?? "";
  const parsed = extractJsonArray(texts);
  return Array.isArray(parsed) ? (parsed as DiscoveredItem[]) : [];
}
