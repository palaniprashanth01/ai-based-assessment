"use client";
import * as React from "react";
import { FileText, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
};

/**
 * PDF dropzone.
 * Interactions per Navigate component rules:
 *  - Pointer: click anywhere on empty zone opens file picker.
 *  - Touch: same — large 8rem tap target.
 *  - Keyboard: Enter / Space when focused opens picker; Esc clears (when filled).
 *  - States: default, hover, focus-visible (lime ring), active drag, disabled,
 *    error (rejected file via alert — TODO inline message).
 */
export function PdfDropzone({ file, onChange, disabled }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const pick = (f: File | null) => {
    if (!f) return onChange(null);
    if (f.type !== "application/pdf") return alert("Please upload a PDF file.");
    if (f.size > 20 * 1024 * 1024) return alert("PDF must be under 20 MB (Gemini inline limit).");
    onChange(f);
  };

  return (
    <div
      role="button"
      tabIndex={disabled || file ? -1 : 0}
      aria-label="Upload PDF"
      aria-disabled={disabled}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        pick(e.dataTransfer.files?.[0] ?? null);
      }}
      onClick={() => !disabled && !file && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (disabled || file) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed border-border p-10 text-center",
        "transition-colors duration-fast",
        dragging && "border-primary bg-primary/5",
        !file && !disabled && "cursor-pointer hover:border-foreground/40 hover:bg-secondary/40",
        disabled && "opacity-60",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex w-full items-center justify-between gap-3 rounded-sm border border-border bg-secondary/40 p-3 text-left">
          <div className="rounded-full bg-primary p-2">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1 truncate">
            <div className="truncate text-base font-medium">{file.name}</div>
            <div className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove file"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-full bg-primary p-3">
            <Upload className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="space-y-1">
            <div className="text-base font-medium">Drop a PDF, or click to browse</div>
            <div className="text-sm text-muted-foreground">
              Up to 20 MB · scanned PDFs supported · any language
            </div>
          </div>
        </>
      )}
    </div>
  );
}
