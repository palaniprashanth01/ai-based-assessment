import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ASSESSMENT_SCHEMA } from "@/lib/gemini-schema";
import { buildPrompt } from "@/lib/prompt";
import type { AssessmentRequest, AssessmentResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Tried in order. Each model handles multimodal PDF input + structured output.
 * Falls back automatically when an upstream model is overloaded (503), rate-
 * limited (429), or unavailable. The user only sees an error if every model
 * in the chain fails.
 */
const MODEL_CHAIN = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes("[503") ||
    m.includes("[429") ||
    m.includes("[500") ||
    m.includes("high demand") ||
    m.includes("overloaded") ||
    m.includes("unavailable") ||
    m.includes("internal error") ||
    m.includes("quota") ||
    m.includes("rate limit")
  );
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
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

  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = buildPrompt({ bloomLevel, numQuestions, language: language || "auto" });
  const attempted: { model: string; error: string }[] = [];

  for (const modelName of MODEL_CHAIN) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: ASSESSMENT_SCHEMA,
        temperature: 0.4,
      },
    });

    try {
      const result = await model.generateContent([
        { inlineData: { data: pdfBase64, mimeType: "application/pdf" } },
        { text: prompt },
      ]);
      const json = JSON.parse(result.response.text()) as AssessmentResponse;
      // Echo which model actually answered (useful in the UI for debugging).
      return NextResponse.json({ ...json, _model: modelName });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      attempted.push({ model: modelName, error: message });

      if (!isRetryableError(err)) {
        // Non-retryable (e.g. invalid PDF, bad API key) — bubble up immediately
        // rather than burning time on the rest of the chain.
        return NextResponse.json(
          { error: message, attempted },
          { status: 502 },
        );
      }
      // Retryable — fall through to the next model.
    }
  }

  // Every model in the chain returned a retryable error.
  return NextResponse.json(
    {
      error:
        "Gemini is overloaded right now across every available model. Please try again in a minute.",
      attempted,
    },
    { status: 503 },
  );
}
