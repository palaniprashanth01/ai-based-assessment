"use client";
import * as React from "react";
import { Download, FileText, FileSpreadsheet, FileJson, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadBlob, sanitizeFilename, toCSV, toMarkdown, toPDF } from "@/lib/export";
import type { AssessmentResponse } from "@/lib/types";

/**
 * Export menu. Pure client side.
 * Keyboard: Tab opens the menu, Esc closes it, Enter activates an item.
 * Touch: each item is ≥44px tall.
 */
export function ExportMenu({ result, sourceName }: { result: AssessmentResponse; sourceName?: string }) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const base = sanitizeFilename(sourceName ?? "assessment");

  // Click-outside + Esc close
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const downloadMd = () => {
    downloadBlob(new Blob([toMarkdown(result, sourceName)], { type: "text/markdown" }), `${base}.md`);
    setOpen(false);
  };
  const downloadCsv = () => {
    downloadBlob(new Blob([toCSV(result)], { type: "text/csv" }), `${base}.csv`);
    setOpen(false);
  };
  const downloadPdf = async () => {
    const blob = await toPDF(result, sourceName);
    downloadBlob(blob, `${base}.pdf`);
    setOpen(false);
  };
  const copyMd = async () => {
    await navigator.clipboard.writeText(toMarkdown(result, sourceName));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setOpen(false);
  };

  const items = [
    { icon: FileText, label: "Download as PDF", onClick: downloadPdf, hint: "Printable worksheet" },
    { icon: FileSpreadsheet, label: "Download as CSV", onClick: downloadCsv, hint: "Import into Sheets/Excel" },
    { icon: FileJson, label: "Download as Markdown", onClick: downloadMd, hint: ".md file" },
    {
      icon: copied ? Check : Copy,
      label: copied ? "Copied!" : "Copy as Markdown",
      onClick: copyMd,
      hint: "To clipboard",
    },
  ];

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        <Download className="h-4 w-4" />
        Export
      </Button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-sm border border-border bg-card p-1 shadow-xl",
            "animate-in fade-in-0 zoom-in-95 duration-fast",
          )}
        >
          {items.map((it, i) => (
            <button
              key={i}
              role="menuitem"
              type="button"
              onClick={it.onClick}
              className={cn(
                "flex w-full items-start gap-3 rounded-[16px] px-3 py-2 text-left text-sm min-h-[44px]",
                "transition-colors duration-fast hover:bg-secondary",
                "focus-visible:bg-secondary focus-visible:outline-none",
              )}
            >
              <it.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{it.label}</span>
                <span className="text-xs text-muted-foreground">{it.hint}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
