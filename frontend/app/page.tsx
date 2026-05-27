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
import { ExportMenu } from "@/components/export-menu";
import { ProgressSteps, type ProgressStep } from "@/components/progress-steps";
import { readPageCount } from "@/lib/pdf-meta";
import type { AssessmentResponse, BloomLevel } from "@/lib/types";

/**
 * Rough estimate: each parallel Groq chunk covers ~4 pages of a typical
 * dense PDF. Conservative — used only for the up-front coverage hint.
 */
const PAGES_PER_CHUNK = 4;
/** Matches HARD_CHUNK_CAP in the route handler. */
const MAX_CHUNKS = 6;

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
  const [pageCount, setPageCount] = React.useState<number | null>(null);
  const [step, setStep] = React.useState<ProgressStep>("idle");
  const resultsRef = React.useRef<HTMLDivElement>(null);

  // Read page count client-side when a new file is picked.
  React.useEffect(() => {
    if (!file) {
      setPageCount(null);
      return;
    }
    let cancelled = false;
    readPageCount(file).then((n) => {
      if (!cancelled) setPageCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  // The route caps parallel chunks at HARD_CHUNK_CAP (6), so estimated
  // coverage is bounded by both the user's chunk budget and that cap.
  // We can't read env vars from the browser, so we display a generic
  // estimate; the precise value lands in the post-generation banner.
  const estimatedCoverage = MAX_CHUNKS * PAGES_PER_CHUNK;

  const onGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setStep("encoding");
    try {
      const pdfBase64 = await fileToBase64(file);
      setStep("uploading");
      // Brief delay between encoding/uploading so the visual transition reads.
      const requestPromise = fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64, bloomLevel: bloom, numQuestions, language }),
      });
      // We can't observe server-side phases from the browser without SSE, so
      // approximate the back-end pipeline with timed transitions. The actual
      // request races these — whichever finishes first wins. The point is to
      // give the user *some* sense of progress during the 5-10s wait.
      const phaseTimers: ReturnType<typeof setTimeout>[] = [
        setTimeout(() => setStep("parsing"), 400),
        setTimeout(() => setStep("generating"), 1500),
        setTimeout(() => setStep("merging"), 8000),
      ];
      const res = await requestPromise.finally(() => phaseTimers.forEach(clearTimeout));
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      const json = (await res.json()) as AssessmentResponse;
      setStep("done");
      setResult(json);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      setStep("idle");
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
            <PdfDropzone
              file={file}
              onChange={setFile}
              disabled={loading}
              pageCount={pageCount}
              estimatedCoverage={estimatedCoverage}
            />
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

      {/* ───── Progress + skeletons (only while waiting on the API) ───── */}
      {loading && (
        <>
          <ProgressSteps step={step} />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-sm" />
            <Skeleton className="h-64 rounded-sm" />
            <Skeleton className="h-96 rounded-sm lg:col-span-2" />
          </div>
        </>
      )}

      {/* ───── Results ───── */}
      {result && (
        <section ref={resultsRef} className="mt-14 space-y-6 scroll-mt-12">
          {result._truncated && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="flex items-start gap-3 p-4 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 text-primary" />
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">Partial coverage.</span>{" "}
                  {result._totalPages}-page PDF processed across {result._chunksRun} chunk
                  {result._chunksRun === 1 ? "" : "s"} (
                  {result._coveredChars && result._docChars
                    ? `${Math.round((result._coveredChars / result._docChars) * 100)}%`
                    : "partial"}{" "}
                  of the text). Add another <code className="rounded bg-secondary px-1 py-0.5 text-xs">GROQ_API_KEY_*</code> env var to cover more
                  in a single run, or upgrade Groq plan.
                </div>
              </CardContent>
            </Card>
          )}
          {result._chunksRun && result._chunksRun > 1 && !result._truncated && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-start gap-3 p-4 text-sm">
                <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">Full coverage.</span>{" "}
                  {result._totalPages} pages processed in {result._chunksRun} parallel chunks
                  across {new Set(result._keyIndices).size} key
                  {new Set(result._keyIndices).size === 1 ? "" : "s"}.
                </div>
              </CardContent>
            </Card>
          )}

          <SummaryPanel summary={result.summary} language={result.detectedLanguage} />

          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-2xl font-medium tracking-tight">
                {result.mcqs.length} questions
              </h2>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs capitalize text-muted-foreground">
                  Bloom · {bloom}
                </span>
                <ExportMenu result={result} sourceName={file?.name} />
              </div>
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
