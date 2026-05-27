import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { extractText, getDocumentProxy } from "unpdf";
import { AssessmentSchema } from "@/lib/schema";
import { buildPrompt } from "@/lib/prompt";
import type { AssessmentRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 26; // Netlify free-tier ceiling.

/**
 * Groq model fallback chain. Llama-3.3-70B is the highest-quality option and
 * usually returns in 2–5s for a typical PDF. If it's rate-limited, fall back
 * to llama-3.1-8b-instant — same JSON-mode support, ~2× faster, lower quality.
 */
const MODEL_CHAIN = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

/** Llama-3.3-70b has a 131K context window; cap source text generously. */
const MAX_DOC_CHARS = 90_000;

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes("503") ||
    m.includes("502") ||
    m.includes("500") ||
    m.includes("429") ||
    m.includes("rate") ||
    m.includes("overloaded") ||
    m.includes("unavailable") ||
    m.includes("timeout")
  );
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
  }

  let body: AssessmentRequest;
  try {
    body = (await req.json()) as AssessmentRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { pdfBase64, bloomLevel, numQuestions, language } = body;
  if (!pdfBase64) return NextResponse.json({ error: "pdfBase64 is required." }, { status: 400 });
  if (!bloomLevel) return NextResponse.json({ error: "bloomLevel is required." }, { status: 400 });
  if (!numQuestions || numQuestions < 1 || numQuestions > 25) {
    return NextResponse.json({ error: "numQuestions must be between 1 and 25." }, { status: 400 });
  }

  // 1. Extract text from the PDF.
  let docText: string;
  let totalPages: number;
  try {
    const buf = Buffer.from(pdfBase64, "base64");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const result = await extractText(pdf, { mergePages: true });
    docText = (result.text ?? "").trim();
    totalPages = result.totalPages;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown PDF parse error.";
    return NextResponse.json({ error: `Could not parse PDF: ${msg}` }, { status: 422 });
  }

  if (docText.length < 50) {
    return NextResponse.json(
      {
        error:
          "No readable text in this PDF. It looks like a scanned/image-only PDF, which needs OCR. Try a text-based PDF (most academic papers, ebooks, and reports work).",
      },
      { status: 422 },
    );
  }

  // 2. Truncate large docs to stay within Llama's context window.
  const truncated = docText.length > MAX_DOC_CHARS;
  const sourceText = truncated ? docText.slice(0, MAX_DOC_CHARS) : docText;

  // 3. Call Groq with structured-JSON mode, walking the model chain on failure.
  const groq = new Groq({ apiKey });
  const systemPrompt = buildPrompt({
    bloomLevel,
    numQuestions,
    language: language || "auto",
  });
  const attempted: { model: string; error: string }[] = [];

  for (const modelName of MODEL_CHAIN) {
    try {
      const completion = await groq.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Document (${totalPages} pages${truncated ? `, truncated to first ${MAX_DOC_CHARS} characters` : ""}):\n\n${sourceText}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_completion_tokens: 8000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("Empty response from Groq.");

      let raw: unknown;
      try {
        raw = JSON.parse(content);
      } catch {
        throw new Error("Model returned malformed JSON.");
      }

      const parsed = AssessmentSchema.safeParse(raw);
      if (!parsed.success) {
        // Schema drift — record and try the next model.
        throw new Error(`Schema validation failed: ${parsed.error.issues.map((i) => i.path.join(".") + ": " + i.message).join("; ")}`);
      }

      return NextResponse.json({
        ...parsed.data,
        _model: modelName,
        _totalPages: totalPages,
        _truncated: truncated,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      attempted.push({ model: modelName, error: message });
      if (!isRetryableError(err) && !message.includes("Schema") && !message.includes("malformed")) {
        // Hard failure (e.g. invalid key) — stop walking the chain.
        return NextResponse.json({ error: message, attempted }, { status: 502 });
      }
      // Otherwise fall through to the next model.
    }
  }

  return NextResponse.json(
    {
      error:
        "Every Groq model in the fallback chain failed. This is usually a transient rate limit — try again in a minute.",
      attempted,
    },
    { status: 503 },
  );
}
