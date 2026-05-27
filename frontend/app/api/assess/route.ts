import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { extractText, getDocumentProxy } from "unpdf";
import { AssessmentSchema, type AssessmentParsed } from "@/lib/schema";
import { buildPrompt } from "@/lib/prompt";
import { chunkText, mergeAssessments } from "@/lib/chunking";
import type { AssessmentRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 26;

const MODEL_CHAIN = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

/** Per-chunk character budget. ≈ 4K input tokens; pairs with 4K completion. */
const CHARS_PER_CHUNK = 16_000;

/** Hard cap on chunks per request to stay inside Netlify's 26s function ceiling. */
const HARD_CHUNK_CAP = 6;

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
    m.includes("413") ||
    m.includes("rate") ||
    m.includes("token") ||
    m.includes("overloaded") ||
    m.includes("unavailable") ||
    m.includes("timeout")
  );
}

/**
 * Run one chunk through the model fallback chain on a single API key.
 * Returns the parsed, schema-validated assessment, or throws with the most
 * recent error if every model on this key failed.
 */
async function runChunk(args: {
  chunkText: string;
  chunkIndex: number;
  totalChunks: number;
  totalPages: number;
  mcqsForChunk: number;
  apiKey: string;
  keyIndex: number;
  systemPrompt: string;
}): Promise<{ result: AssessmentParsed; model: string; keyIndex: number }> {
  const groq = new Groq({ apiKey: args.apiKey });
  const chunkContext =
    args.totalChunks > 1
      ? `Part ${args.chunkIndex + 1} of ${args.totalChunks} of a ${args.totalPages}-page document. Generate exactly ${args.mcqsForChunk} MCQs covering THIS section. Do not reference parts you have not seen.`
      : `${args.totalPages}-page document.`;
  const userMessage = `${chunkContext}\n\nDocument text:\n\n${args.chunkText}`;

  let lastErr: unknown = null;
  for (const modelName of MODEL_CHAIN) {
    try {
      const completion = await groq.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: args.systemPrompt },
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

      return { result: parsed.data, model: modelName, keyIndex: args.keyIndex };
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      const isSchema = message.includes("Schema") || message.includes("malformed");
      if (!isRetryableError(err) && !isSchema) {
        // Hard failure (auth, etc.) — surface immediately.
        throw err;
      }
      // Retryable → try next model on the same key.
    }
  }
  throw lastErr ?? new Error("Unknown chunk failure");
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

  // 2. Split into chunks. Cap parallelism at the number of API keys so each
  //    parallel call has its own TPM bucket and concurrent requests don't
  //    fight for the same per-key budget.
  const allChunks = chunkText(docText, CHARS_PER_CHUNK);
  const maxParallel = Math.min(apiKeys.length, HARD_CHUNK_CAP);
  const usedChunks = allChunks.slice(0, maxParallel);
  const truncated = allChunks.length > usedChunks.length;
  const coveredChars = usedChunks.reduce((n, c) => n + c.length, 0);

  // Distribute the requested question count across the chunks we'll run.
  const mcqsPerChunk = Math.max(1, Math.ceil(numQuestions / usedChunks.length));

  const systemPrompt = buildPrompt({
    bloomLevel,
    numQuestions: mcqsPerChunk,
    language: language || "auto",
  });

  // 3. Run all chunks in parallel, each pinned to its own API key.
  const settled = await Promise.allSettled(
    usedChunks.map((chunk, i) =>
      runChunk({
        chunkText: chunk,
        chunkIndex: i,
        totalChunks: usedChunks.length,
        totalPages,
        mcqsForChunk: mcqsPerChunk,
        apiKey: apiKeys[i],
        keyIndex: i,
        systemPrompt,
      }),
    ),
  );

  const succeeded = settled
    .map((s, i) => ({ s, i }))
    .filter(
      (x): x is { s: PromiseFulfilledResult<Awaited<ReturnType<typeof runChunk>>>; i: number } =>
        x.s.status === "fulfilled",
    )
    .map((x) => x.s.value);
  const failures = settled
    .map((s, i) => ({ s, i }))
    .filter((x): x is { s: PromiseRejectedResult; i: number } => x.s.status === "rejected")
    .map((x) => ({
      chunk: x.i,
      error: x.s.reason instanceof Error ? x.s.reason.message : String(x.s.reason),
    }));

  if (succeeded.length === 0) {
    const firstErr = failures[0]?.error ?? "unknown";
    const isTpm = /rate_limit_exceeded|tokens per minute|TPM|413/i.test(firstErr);
    const hint = isTpm
      ? ` Free-tier TPM was exceeded across all ${apiKeys.length} key${apiKeys.length === 1 ? "" : "s"}. Add another GROQ_API_KEY_${apiKeys.length + 1} env var, upload a smaller PDF, or upgrade to Groq Developer tier.`
      : " Try again in a minute or upload a smaller PDF.";
    return NextResponse.json(
      {
        error: `All chunks failed (${usedChunks.length} attempted across ${apiKeys.length} key${apiKeys.length === 1 ? "" : "s"}). First error: ${firstErr.slice(0, 400)}.${hint}`,
        failures,
      },
      { status: 503 },
    );
  }

  // 4. Merge whatever survived.
  const merged = mergeAssessments(
    succeeded.map((s) => s.result),
    numQuestions,
  );

  return NextResponse.json({
    ...merged,
    _models: succeeded.map((s) => s.model),
    _keyIndices: succeeded.map((s) => s.keyIndex),
    _chunksRun: succeeded.length,
    _chunksTotal: allChunks.length,
    _totalPages: totalPages,
    _coveredChars: coveredChars,
    _docChars: docText.length,
    _truncated: truncated,
    _partialFailures: failures.length > 0 ? failures : undefined,
  });
}
