# Lingo — a LingQ-style language learning app

Read texts in a foreign language, click words to save them with a status and
translation, and review them with spaced repetition. Built with Next.js
(App Router) + TypeScript.

## Features (current MVP)

- **Library** — your lessons with reading progress and vocabulary stats.
- **Reader** — paste any text; words are highlighted by status (blue = new,
  fading yellow = learning, none = known). Click a word to set its status and
  save a translation/notes.
- **Vocabulary** — every saved word, filterable by status, searchable. This is
  your vocabulary _profile_, which powers the agentic features below.
- **Discover** _(agentic)_ — Claude searches the live web (server-side web
  search + fetch) for authentic content in your target language that reuses the
  words you're learning and stays at a comprehensible level, then drops it into
  your reader.
- **Debate** _(agentic)_ — an AI partner that's "read" your article. A two-gear
  flow: first you retell it, then you debate — it takes a stance, pushes back,
  baits you toward complex sentences, steers you to your target words, and
  recasts your mistakes inline.
- **Practice** — write a sentence in your target language and get AI grammar
  corrections with explanations.
- **Import** — create lessons from pasted text, or bulk-import a word list
  (`term, translation` per line).

The agentic features (Discover, Debate, Practice) use the Claude API
(`claude-opus-4-8`) and require `ANTHROPIC_API_KEY`; without it the rest of the
app still works and those pages explain how to enable them.

## Storage

Data is stored as JSON documents through a small `DocStore` abstraction
(`src/lib/store.ts`) with two backends, selected by environment variables:

- **S3** — used when `S3_BUCKET` is set. Documents live under `S3_PREFIX`.
- **Local files** — fallback under `DATA_DIR` (default `.data/`), so the app
  runs with zero config in development.

Layout:

```
lessons/index.json      Lesson[]              (metadata + text)
words/<language>.json   Record<term, Word>    (status, translation, SRS state)
```

Switching from local to S3 is just setting env vars — no code changes.

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build && npm run start
```

### Enabling S3

Copy `.env.example` to `.env` and set:

```
S3_BUCKET=your-bucket
S3_PREFIX=lingo
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## API

| Method | Route                   | Purpose                                  |
| ------ | ----------------------- | ---------------------------------------- |
| GET    | `/api/lessons`          | list lessons                             |
| POST   | `/api/lessons`          | create a lesson `{title,text,language}`  |
| GET    | `/api/lessons/:id`      | get one lesson                           |
| PATCH  | `/api/lessons/:id`      | update reading progress                  |
| DELETE | `/api/lessons/:id`      | delete a lesson                          |
| GET    | `/api/words`            | list saved words                         |
| POST   | `/api/words`            | upsert a word                            |
| POST   | `/api/words/statuses`   | map of `{term: status}` for a term list  |
| POST   | `/api/words/import`     | bulk import a word list                  |
| GET    | `/api/stats`            | known / learning counts                  |
| GET    | `/api/feedback`         | whether AI feedback is configured        |
| POST   | `/api/feedback`         | AI grammar check `{text,language}`       |
| POST   | `/api/discover`         | agentic web search for content `{language,topic?}` |
| POST   | `/api/debate`           | AI debate turn `{language,title,article,vocab,phase,history}` |

## Importing a word list

`POST /api/words/import` with:

```json
{
  "language": "es",
  "overwrite": false,
  "entries": [
    { "term": "perro", "translation": "dog", "status": 2 },
    { "term": "casa", "translation": "house", "status": 5 }
  ]
}
```

Status codes: `0` new, `1–4` learning, `5` known, `-1` ignored.
