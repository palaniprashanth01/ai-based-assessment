import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { extractText, getDocumentProxy } from "unpdf";
import { AssessmentSchema } from "@/lib/schema";
import { buildPrompt } from "@/lib/prompt";
import type { AssessmentRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 26; // Netlify free-tier ceiling.

/**
 * Groq model fallback chain — tuned for the free (on-demand) tier.
 *
 * Groq's free tier caps tokens-per-minute (TPM) per model PER KEY:
 *   gpt-oss-120b:        8K TPM  (too tight for PDFs — dropped)
 *   llama-3.3-70b:      12K TPM  (workable as primary)
 *   llama-3.1-8b:       30K TPM  (best safety net — handles larger docs)
 */
const MODEL_CHAIN = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

/**
 * Cap source text at ~4K input tokens (≈16K chars). Combined with the
 * completion budget below this keeps a single request comfortably inside
 * the 12K TPM limit on llama-3.3-70b. Larger PDFs are truncated and the
 * client is told via the _truncated flag.
 */
const MAX_DOC_CHARS = 16_000;

/**
 * Collect every Groq API key the user has provisioned.
 * - GROQ_API_KEY        (primary, required)
 * - GROQ_API_KEY_2..5   (optional rotation keys)
 *
 * Adding more keys multiplies your free-tier TPM budget linearly. The route
 * rotates through them on TPM rate-limit before falling back to a smaller
 * model — so a 2nd key effectively doubles how many PDFs you can run per
 * minute on the primary high-quality model.
 */
function collectApiKeys(): string[] {
  const keys: string[] = [];
  const primary = process.env.GROQ_API_KEY?.trim();
  if (primary) keys.push(primary);
  for (let i = 2; i <= 5; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`]?.trim();
    if (k) keys.push(k);
  }
  return keys;
}

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes("503") ||
    m.includes("502") ||
    m.includes("500") ||
    m.includes("429") ||
    m.includes("413") || // Groq returns 413 for TPM exceedance
    m.includes("rate") ||
    m.includes("token") ||
    m.includes("overloaded") ||
    m.includes("unavailable") ||
    m.includes("timeout")
  );
}

export async function POST(req: NextRequest) {
  const apiKeys = collectApiKeys();
  if (apiKeys.length === 0) {
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

  // 2. Truncate large docs to stay within the TPM budget.
  const truncated = docText.length > MAX_DOC_CHARS;
  const sourceText = truncated ? docText.slice(0, MAX_DOC_CHARS) : docText;

  const systemPrompt = buildPrompt({
    bloomLevel,
    numQuestions,
    language: language || "auto",
  });
  const userMessage = `Document (${totalPages} pages${truncated ? `, truncated to first ${MAX_DOC_CHARS} characters` : ""}):\n\n${sourceText}`;

  // 3. Walk (model, key) pairs in priority order. Keys rotate first so a TPM
  //    limit on key #1 immediately tries key #2 on the SAME (better) model
  //    before we degrade to a smaller model.
  const attempted: { model: string; keyIndex: number; error: string }[] = [];

  for (const modelName of MODEL_CHAIN) {
    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
      const groq = new Groq({ apiKey: apiKeys[keyIndex] });
      try {
        const completion = await groq.chat.completions.create({
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          response_format: { type: "json_object" },
          temperature: 0.4,
          max_completion_tokens: 4096,
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
          throw new Error(
            `Schema validation failed: ${parsed.error.issues
              .map((i) => i.path.join(".") + ": " + i.message)
              .join("; ")}`,
          );
        }

        return NextResponse.json({
          ...parsed.data,
          _model: modelName,
          _keyIndex: keyIndex,
          _totalPages: totalPages,
          _truncated: truncated,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        attempted.push({ model: modelName, keyIndex, error: message });

        const isSchemaIssue = message.includes("Schema") || message.includes("malformed");
        if (!isRetryableError(err) && !isSchemaIssue) {
          // Hard failure (e.g. invalid key) — surface immediately.
          return NextResponse.json({ error: message, attempted }, { status: 502 });
        }
        // Retryable or schema drift — try the next key/model.
      }
    }
  }

  // All (model × key) combinations failed. Surface the most informative one.
  const firstErr = attempted[0]?.error ?? "unknown";
  const isTpm = /rate_limit_exceeded|tokens per minute|TPM|413/i.test(firstErr);
  const hint = isTpm
    ? ` Even with ${apiKeys.length} key${apiKeys.length === 1 ? "" : "s"}, Groq's free-tier TPM was exceeded. Add another GROQ_API_KEY_${apiKeys.length + 1} env var, upload a smaller PDF, or upgrade to Groq Developer tier.`
    : " Try again in a minute or upload a smaller PDF.";

  return NextResponse.json(
    {
      error: `All Groq attempts failed (${attempted.length} tried across ${MODEL_CHAIN.length} models × ${apiKeys.length} keys). First error: ${firstErr.slice(0, 400)}.${hint}`,
      attempted,
    },
    { status: 503 },
  );
}
