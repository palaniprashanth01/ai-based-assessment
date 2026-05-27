"use client";
import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProgressStep =
  | "idle"
  | "encoding"
  | "uploading"
  | "parsing"
  | "generating"
  | "merging"
  | "done";

const STEP_ORDER: Exclude<ProgressStep, "idle">[] = [
  "encoding",
  "uploading",
  "parsing",
  "generating",
  "merging",
  "done",
];

const STEP_LABELS: Record<Exclude<ProgressStep, "idle">, string> = {
  encoding: "Encoding PDF",
  uploading: "Uploading to server",
  parsing: "Extracting text",
  generating: "Generating with Groq",
  merging: "Merging chunks",
  done: "Complete",
};

/**
 * Pure visual progress indicator. The parent decides which step is active by
 * passing the `step` prop — this component never advances on its own.
 *
 * Accessibility: aria-live="polite" announces step changes to screen readers,
 * but only when the user is actively waiting (i.e. step !== "idle"). Each
 * step row has its visual state mirrored by aria-current.
 */
export function ProgressSteps({ step }: { step: ProgressStep }) {
  if (step === "idle") return null;
  const activeIndex = STEP_ORDER.indexOf(step);

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 rounded-sm border border-border bg-card/60 p-4"
    >
      <ol className="space-y-2">
        {STEP_ORDER.slice(0, -1).map((s, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          return (
            <li
              key={s}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex items-center gap-3 text-sm transition-colors duration-fast",
                isActive ? "text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground/50",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  isDone && "border-primary/60 bg-primary/20 text-primary",
                  !isActive && !isDone && "border-border",
                )}
              >
                {isActive ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isDone ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="text-[10px]">{i + 1}</span>
                )}
              </span>
              <span>{STEP_LABELS[s]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
