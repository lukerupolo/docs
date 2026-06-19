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
