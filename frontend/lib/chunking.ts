import type { AssessmentParsed } from "./schema";

/**
 * Split text into chunks at sentence/paragraph boundaries when possible.
 * Falls back to a hard cut at exactly `chunkSize` if no clean break is
 * available within the back-search window (50% of chunkSize).
 */
export function chunkText(text: string, chunkSize: number): string[] {
  if (text.length <= chunkSize) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const remaining = text.length - i;
    if (remaining <= chunkSize) {
      chunks.push(text.slice(i));
      break;
    }
    const hardEnd = i + chunkSize;
    // Prefer paragraph break, then sentence end, within the back-search window.
    const searchFloor = i + Math.floor(chunkSize * 0.5);
    const paraBreak = text.lastIndexOf("\n\n", hardEnd);
    const sentenceBreak = text.lastIndexOf(". ", hardEnd);
    let cut = hardEnd;
    if (paraBreak > searchFloor) cut = paraBreak + 2;
    else if (sentenceBreak > searchFloor) cut = sentenceBreak + 2;
    chunks.push(text.slice(i, cut));
    i = cut;
  }
  return chunks;
}

/**
 * Merge per-chunk assessments into a single response.
 * - Summary: concatenated with paragraph breaks.
 * - MCQs: deduped by normalized question text, sliced to the target count.
 * - Graph: nodes deduped by id (case-insensitive); edges kept only when both
 *   endpoints survive dedupe; edges deduped by (source, target, relation).
 */
export function mergeAssessments(
  results: AssessmentParsed[],
  targetMcqCount: number,
): AssessmentParsed {
  // ── Summary ─────────────────────────────────────────────────────────
  const summary = results
    .map((r, i) => `**Part ${i + 1} of ${results.length}**\n\n${r.summary.trim()}`)
    .join("\n\n");

  // ── MCQs (dedupe by normalized question) ────────────────────────────
  const seenQuestions = new Set<string>();
  const mergedMcqs: AssessmentParsed["mcqs"] = [];
  for (const r of results) {
    for (const m of r.mcqs) {
      const norm = m.question.toLowerCase().replace(/\s+/g, " ").trim();
      if (seenQuestions.has(norm)) continue;
      seenQuestions.add(norm);
      mergedMcqs.push(m);
    }
  }
  // Interleave so questions from different chunks alternate, giving better
  // topical coverage when the user requested fewer questions than we got.
  const interleavedMcqs = interleave(
    results.map((r) =>
      r.mcqs.filter((m) =>
        mergedMcqs.find((mm) => mm.question === m.question),
      ),
    ),
  ).slice(0, targetMcqCount);

  // ── Graph nodes (dedupe by id, fallback to lowercase label) ─────────
  const nodeMap = new Map<string, AssessmentParsed["graph"]["nodes"][number]>();
  for (const r of results) {
    for (const n of r.graph.nodes) {
      const key = (n.id || n.label).toLowerCase();
      if (!nodeMap.has(key)) nodeMap.set(key, n);
    }
  }
  const mergedNodes = Array.from(nodeMap.values());
  const validIds = new Set(mergedNodes.map((n) => n.id));

  // ── Graph edges (require both endpoints; dedupe by triple) ──────────
  const seenEdges = new Set<string>();
  const mergedEdges: AssessmentParsed["graph"]["edges"] = [];
  for (const r of results) {
    for (const e of r.graph.edges) {
      if (!validIds.has(e.source) || !validIds.has(e.target)) continue;
      const key = `${e.source}|${e.target}|${e.relation.toLowerCase()}`;
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      mergedEdges.push(e);
    }
  }

  // ── Detected language: pick the first non-empty (chunks should agree). ──
  const detectedLanguage =
    results.find((r) => r.detectedLanguage)?.detectedLanguage ?? "en";

  return {
    summary,
    detectedLanguage,
    mcqs: interleavedMcqs,
    graph: { nodes: mergedNodes, edges: mergedEdges },
  };
}

/** Round-robin merge of N arrays. interleave([[1,2],[a,b]]) → [1,a,2,b]. */
function interleave<T>(arrays: T[][]): T[] {
  const result: T[] = [];
  const maxLen = Math.max(...arrays.map((a) => a.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const arr of arrays) {
      if (i < arr.length) result.push(arr[i]);
    }
  }
  return result;
}
