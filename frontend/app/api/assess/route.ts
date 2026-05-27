import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ASSESSMENT_SCHEMA } from "@/lib/gemini-schema";
import { buildPrompt } from "@/lib/prompt";
import type { AssessmentRequest, AssessmentResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ASSESSMENT_SCHEMA,
      temperature: 0.4,
    },
  });

  try {
    const result = await model.generateContent([
      { inlineData: { data: pdfBase64, mimeType: "application/pdf" } },
      { text: buildPrompt({ bloomLevel, numQuestions, language: language || "auto" }) },
    ]);
    const json = JSON.parse(result.response.text()) as AssessmentResponse;
    return NextResponse.json(json);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error from Gemini.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
