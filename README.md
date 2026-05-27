# AI Based Assessment

Turn any PDF into a structured assessment — summary, Bloom's-taxonomy-aligned multiple-choice questions, and a knowledge graph — in a single Gemini 2.5 Flash call.

Deployable to **Netlify** with one click. No Python, no OCR pipeline, no separate ML servers.

## Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + Tailwind + shadcn/ui |
| API | Next.js Route Handler (auto-deployed as Netlify Function via `@netlify/plugin-nextjs`) |
| LLM | Google **Gemini 2.5 Flash** with `responseSchema` for guaranteed structured JSON |
| OCR | Native to Gemini (multimodal — scanned PDFs work without Tesseract) |
| Algorithms | GraphRAG-style entity/relation extraction · Bloom's-conditioned MCQ generation |
| Graph viz | `react-force-graph-2d` (D3-force, client-side) |
| Multilingual | Native Gemini (no `deep-translator`, no Noto font downloads) |
| Hosting | **Netlify** |

## Features

- **Drag-and-drop PDF upload** (scanned PDFs OK, up to 20 MB)
- **Bloom's taxonomy** — pick any of 6 cognitive levels (Remember → Create)
- **Configurable question count** (3–20)
- **Multilingual output** — match source language or translate to 13+ languages
- **Interactive MCQs** — click an option, see correctness, reveal explanation
- **Knowledge graph** — interactive force-directed graph colored by entity type
- **Structured output** — `responseSchema` guarantees parseable JSON every call

## Run locally

```bash
cd frontend
npm install
cp ../.env.example ../.env.local
# edit .env.local and paste your GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000.

Get a free Gemini API key (no credit card) at https://aistudio.google.com/apikey.

## Deploy to Netlify

1. Push this repo to GitHub.
2. On Netlify: **Add new site → Import from Git** → select the repo.
3. Netlify auto-detects `netlify.toml`. No build settings to change.
4. In **Site settings → Environment variables**, add `GEMINI_API_KEY`.
5. **Deploy**. Done.

The Next.js Route Handler at `frontend/app/api/assess/route.ts` is automatically deployed as a Netlify Function. PDF processing happens inside it; nothing else runs on the server.

## Project layout

```
frontend/                    Next.js app (Netlify-deployed)
  app/
    page.tsx                 Landing + app UI
    api/assess/route.ts      Server route → Gemini call
  components/                shadcn/ui primitives + feature components
  lib/
    gemini-schema.ts         responseSchema (summary, mcqs[], graph)
    prompt.ts                Bloom-aware system prompt
    types.ts                 Shared TS types
netlify.toml                 Netlify build + plugin config
.env.example                 GEMINI_API_KEY template
```

## How it works

1. The browser reads the PDF and base64-encodes it.
2. POST `/api/assess` with `{ pdfBase64, bloomLevel, numQuestions, language }`.
3. The route sends the PDF inline to Gemini 2.5 Flash with a structured `responseSchema`.
4. Gemini reads the PDF (vision OCR if scanned), then returns one JSON object containing the summary, MCQs, and knowledge graph.
5. The frontend renders MCQs as interactive cards and the graph with `react-force-graph-2d`.

## Legacy

The original Python/Gradio app (`ai_basesd_assessment.py`, `requirements.txt`, `.venv/`, `NotoSans-*.ttf`) is retained at the repo root for reference. It is no longer used.
