# AI Based Assessment

Turn any PDF into a structured assessment — summary, Bloom's-taxonomy-aligned multiple-choice questions, and a knowledge graph — in **2–5 seconds** via Groq Llama-3.3-70B.

Deployable to **Netlify** with one click. No Python, no ML servers, no GPU bills.

## Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + Tailwind + shadcn/ui |
| API | Next.js Route Handler (auto-deployed as Netlify Function via `@netlify/plugin-nextjs`) |
| PDF extraction | `unpdf` (serverless-friendly, no native deps) |
| LLM | **Groq Llama-3.3-70B-versatile** with `response_format: json_object` + Zod schema validation |
| Fallback chain | `llama-3.3-70b-versatile` → `llama-3.1-8b-instant` on 429/503 |
| Algorithms | GraphRAG-style entity/relation extraction · Bloom's-conditioned MCQ generation |
| Graph viz | `react-force-graph-2d` (D3-force, client-side) |
| Multilingual | Llama-3.3 reads/writes 13+ languages natively |
| Hosting | **Netlify** |

## Features

- **Drag-and-drop PDF upload** up to 20 MB
- **Bloom's taxonomy** — pick any of 6 cognitive levels (Remember → Create)
- **Configurable question count** (3–20)
- **Multilingual output** — match source language or translate to 13+ languages
- **Interactive MCQs** — click an option, see correctness, reveal explanation
- **Knowledge graph** — interactive force-directed graph colored by entity type
- **Structured output** — Groq JSON mode + Zod validation = parseable JSON every call

## Limitation

PDF text is extracted with `unpdf`, which **does not OCR**. Scanned/image-only PDFs return no text and surface a clear error message. For most modern text-based PDFs (papers, ebooks, reports) this works perfectly.

## Run locally

```bash
cd frontend
npm install
cp ../.env.example ../.env.local
# edit .env.local and paste your GROQ_API_KEY
npm run dev
```

Open http://localhost:3000.

Get a free Groq API key (no credit card) at https://console.groq.com/keys.

## Deploy to Netlify

1. Push this repo to GitHub.
2. On Netlify: **Add new site → Import from Git** → select the repo.
3. Netlify auto-detects `netlify.toml`. No build settings to change.
4. In **Site settings → Environment variables**, add `GROQ_API_KEY`.
5. **Deploy**. Done.

The Next.js Route Handler at `frontend/app/api/assess/route.ts` is automatically deployed as a Netlify Function. PDF parsing + Groq call happen inside it; nothing else runs on the server.

## Project layout

```
frontend/                    Next.js app (Netlify-deployed)
  app/
    page.tsx                 Landing + app UI
    api/assess/route.ts      Server route → unpdf + Groq
  components/                shadcn/ui primitives + feature components
  lib/
    schema.ts                Zod validator + JSON shape for Llama
    prompt.ts                Bloom-aware system prompt
    types.ts                 Shared TS types
netlify.toml                 Netlify build + plugin config
.env.example                 GROQ_API_KEY template
```

## How it works

1. The browser reads the PDF and base64-encodes it.
2. POST `/api/assess` with `{ pdfBase64, bloomLevel, numQuestions, language }`.
3. The route uses `unpdf` to extract text from the PDF (no OCR — text-based PDFs only).
4. The text is sent to Groq Llama-3.3-70B with `response_format: json_object`.
5. The response is validated with Zod, then returned as one JSON object containing summary, MCQs, and knowledge graph.
6. The frontend renders MCQs as interactive cards and the graph with `react-force-graph-2d`.

## Legacy

The original Python/Gradio app (`ai_basesd_assessment.py`, `requirements.txt`, `.venv/`, `NotoSans-*.ttf`) is retained at the repo root for reference. It is no longer used.
