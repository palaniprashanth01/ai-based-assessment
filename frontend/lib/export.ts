import type { AssessmentResponse } from "./types";

/* ───────────────────── Markdown ───────────────────── */

export function toMarkdown(r: AssessmentResponse, sourceName?: string): string {
  const lines: string[] = [];
  lines.push(`# Assessment${sourceName ? `: ${sourceName}` : ""}`);
  lines.push("");
  if (r._totalPages) lines.push(`*${r._totalPages} pages · ${r.mcqs.length} questions · generated via Groq*`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(r.summary);
  lines.push("");
  lines.push("## Questions");
  lines.push("");
  r.mcqs.forEach((m, i) => {
    lines.push(`### Q${i + 1}. ${m.question}`);
    lines.push(`*Bloom: ${m.bloomLevel}*`);
    lines.push("");
    m.options.forEach((opt, j) => {
      const marker = j === m.correctIndex ? "**✓**" : " ";
      lines.push(`- ${marker} ${String.fromCharCode(65 + j)}. ${opt}`);
    });
    if (m.explanation) {
      lines.push("");
      lines.push(`> ${m.explanation}`);
    }
    lines.push("");
  });
  if (r.graph.nodes.length > 0) {
    lines.push("## Knowledge graph");
    lines.push("");
    lines.push("### Entities");
    r.graph.nodes.forEach((n) => lines.push(`- **${n.label}** (${n.type ?? "concept"})`));
    lines.push("");
    if (r.graph.edges.length > 0) {
      lines.push("### Relationships");
      r.graph.edges.forEach((e) => lines.push(`- ${e.source} → *${e.relation}* → ${e.target}`));
    }
  }
  return lines.join("\n");
}

/* ───────────────────── CSV ───────────────────── */

export function toCSV(r: AssessmentResponse): string {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = [
    "number",
    "bloom_level",
    "question",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct",
    "explanation",
  ].join(",");
  const rows = r.mcqs.map((m, i) =>
    [
      i + 1,
      m.bloomLevel,
      escape(m.question),
      escape(m.options[0] ?? ""),
      escape(m.options[1] ?? ""),
      escape(m.options[2] ?? ""),
      escape(m.options[3] ?? ""),
      String.fromCharCode(65 + m.correctIndex),
      escape(m.explanation ?? ""),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

/* ───────────────────── PDF ───────────────────── */

export async function toPDF(r: AssessmentResponse, sourceName?: string): Promise<Blob> {
  // Dynamic import keeps jspdf (~150 KB) out of the initial bundle.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const newPageIfNeeded = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, size: number, opts?: { bold?: boolean; gap?: number }) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    const lineHeight = size * 1.35;
    newPageIfNeeded(lines.length * lineHeight);
    lines.forEach((line) => {
      doc.text(line, margin, y);
      y += lineHeight;
    });
    y += opts?.gap ?? 4;
  };

  // Header
  writeWrapped(`Assessment${sourceName ? `: ${sourceName}` : ""}`, 20, { bold: true, gap: 8 });
  if (r._totalPages) {
    writeWrapped(`${r._totalPages} pages · ${r.mcqs.length} questions · Groq`, 9, { gap: 16 });
  }

  // Summary
  writeWrapped("Summary", 14, { bold: true, gap: 8 });
  writeWrapped(r.summary, 10, { gap: 16 });

  // MCQs
  writeWrapped("Questions", 14, { bold: true, gap: 8 });
  r.mcqs.forEach((m, i) => {
    writeWrapped(`Q${i + 1}. ${m.question}`, 11, { bold: true, gap: 4 });
    writeWrapped(`Bloom: ${m.bloomLevel}`, 8, { gap: 6 });
    m.options.forEach((opt, j) => {
      const marker = j === m.correctIndex ? "✓" : " ";
      writeWrapped(`${marker} ${String.fromCharCode(65 + j)}. ${opt}`, 10, { gap: 2 });
    });
    if (m.explanation) {
      writeWrapped(`Explanation: ${m.explanation}`, 9, { gap: 12 });
    } else {
      y += 8;
    }
  });

  // Graph
  if (r.graph.nodes.length > 0) {
    writeWrapped("Knowledge graph", 14, { bold: true, gap: 8 });
    writeWrapped("Entities:", 11, { bold: true, gap: 4 });
    r.graph.nodes.forEach((n) => writeWrapped(`• ${n.label} (${n.type ?? "concept"})`, 9, { gap: 2 }));
    if (r.graph.edges.length > 0) {
      y += 8;
      writeWrapped("Relationships:", 11, { bold: true, gap: 4 });
      r.graph.edges.forEach((e) => writeWrapped(`• ${e.source} → ${e.relation} → ${e.target}`, 9, { gap: 2 }));
    }
  }

  return doc.output("blob");
}

/* ───────────────────── Download trigger ───────────────────── */

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function sanitizeFilename(name: string): string {
  return (name || "assessment")
    .replace(/\.[^.]+$/, "") // drop extension
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "assessment";
}
