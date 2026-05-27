"use client";
import * as React from "react";
import { Sparkles, Loader2, AlertCircle, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PdfDropzone } from "@/components/pdf-dropzone";
import { BloomSelector } from "@/components/bloom-selector";
import { LanguageSelector } from "@/components/language-selector";
import { SummaryPanel } from "@/components/summary-panel";
import { MCQCard } from "@/components/mcq-card";
import { KnowledgeGraph } from "@/components/knowledge-graph";
import type { AssessmentResponse, BloomLevel } from "@/lib/types";

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default function Page() {
  const [file, setFile] = React.useState<File | null>(null);
  const [bloom, setBloom] = React.useState<BloomLevel>("understand");
  const [language, setLanguage] = React.useState("auto");
  const [numQuestions, setNumQuestions] = React.useState(8);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<AssessmentResponse | null>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const onGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const pdfBase64 = await fileToBase64(file);
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64, bloomLevel: bloom, numQuestions, language }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      const json = (await res.json()) as AssessmentResponse;
      setResult(json);
      // Scroll results into view — fast motion token.
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 md:py-20">
      {/* ───── Hero ───── */}
      <header className="mb-14 space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          Navigate · PDF → Assessment
        </div>

        <h1 className="text-2xl font-medium leading-[0.95] tracking-tight md:text-3xl">
          Drop a PDF.<br />
          <span className="text-primary">Get an assessment.</span>
        </h1>

        <p className="max-w-xl text-base text-muted-foreground md:text-xl">
          Bloom&rsquo;s-aligned MCQs, a summary, and a knowledge graph in a single Gemini 2.5 Flash call.
          Scanned PDFs and any language — no setup required.
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-2.5 py-0.5">Gemini 2.5 Flash</span>
          <span className="rounded-full border border-border px-2.5 py-0.5">GraphRAG</span>
          <span className="rounded-full border border-border px-2.5 py-0.5">WCAG 2.2 AA</span>
          <span className="rounded-full border border-border px-2.5 py-0.5">Netlify-ready</span>
        </div>
      </header>

      {/* ───── Config panels ───── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                1
              </span>
              Upload your PDF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PdfDropzone file={file} onChange={setFile} disabled={loading} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                2
              </span>
              Configure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <BloomSelector value={bloom} onChange={setBloom} disabled={loading} />
            <LanguageSelector value={language} onChange={setLanguage} disabled={loading} />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Number of questions</Label>
                <span className="text-base tabular-nums text-primary">{numQuestions}</span>
              </div>
              <Slider
                value={[numQuestions]}
                min={3}
                max={20}
                step={1}
                onValueChange={(v) => setNumQuestions(v[0])}
                disabled={loading}
                aria-label="Number of questions"
              />
            </div>
            <Separator />
            <Button
              className="w-full"
              size="lg"
              disabled={!file || loading}
              onClick={onGenerate}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate
                  <ArrowDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ───── Errors ───── */}
      {error && (
        <Card className="mt-8 border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
            <div>
              <div className="font-medium text-destructive">Something went wrong</div>
              <div className="text-muted-foreground">{error}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ───── Loading skeletons ───── */}
      {loading && (
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-sm" />
          <Skeleton className="h-64 rounded-sm" />
          <Skeleton className="h-96 rounded-sm lg:col-span-2" />
        </div>
      )}

      {/* ───── Results ───── */}
      {result && (
        <section ref={resultsRef} className="mt-14 space-y-6 scroll-mt-12">
          <SummaryPanel summary={result.summary} language={result.detectedLanguage} />

          <div>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-2xl font-medium tracking-tight">
                {result.mcqs.length} questions
              </h2>
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs capitalize text-muted-foreground">
                Bloom · {bloom}
              </span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {result.mcqs.map((m, i) => (
                <MCQCard key={i} mcq={m} index={i} />
              ))}
            </div>
          </div>

          <KnowledgeGraph nodes={result.graph.nodes} edges={result.graph.edges} />
        </section>
      )}

      {/* ───── Footer ───── */}
      <footer className="mt-20 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>
          Powered by Gemini 2.5 Flash · Deployable to Netlify in one click.
        </div>
        <div>
          Get a free key at{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            aistudio.google.com
          </a>
        </div>
      </footer>
    </main>
  );
}
