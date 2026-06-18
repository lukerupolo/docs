# Lingo — a LingQ-style language learning app

Read texts in a foreign language, click words to save them with a status and
translation, and review them with spaced repetition. Built with Next.js
(App Router) + TypeScript.

## Features (current MVP)

- **Library** — your lessons with reading progress and vocabulary stats.
- **Reader** — paste any text; words are highlighted by status (blue = new,
  fading yellow = learning, none = known). Click a word to set its status and
  save a translation/notes.
- **Vocabulary** — every saved word, filterable by status, searchable.
- **Review** — spaced-repetition (SM-2 lite) flashcards for words that are due.
- **Import** — create lessons from pasted text, or bulk-import a word list
  (`term, translation` per line). This is how a vocabulary export gets ingested.

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
| GET    | `/api/review`           | words due for review                     |
| POST   | `/api/review`           | grade a card `{term,grade}`              |
| GET    | `/api/stats`            | known / learning / due counts            |

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
