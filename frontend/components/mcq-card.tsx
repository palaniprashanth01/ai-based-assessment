"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MCQ } from "@/lib/types";

/**
 * MCQ card.
 * - Correct answer: lime (surface.muted). Incorrect picked: destructive.
 * - Keyboard: each option is a button; Enter/Space picks; Tab cycles.
 * - Touch: option rows are ≥44px tall.
 * - Long content: option text wraps; question wraps; no horizontal scroll.
 */
export function MCQCard({ mcq, index }: { mcq: MCQ; index: number }) {
  const [selected, setSelected] = React.useState<number | null>(null);
  const [revealed, setRevealed] = React.useState(false);

  const isCorrect = selected === mcq.correctIndex;
  const showState = revealed || selected !== null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug">
            <span className="text-muted-foreground">Q{String(index + 1).padStart(2, "0")}.</span>{" "}
            {mcq.question}
          </CardTitle>
          <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs capitalize text-muted-foreground">
            {mcq.bloomLevel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {mcq.options.map((opt, i) => {
          const isPicked = selected === i;
          const isAnswer = mcq.correctIndex === i;
          return (
            <button
              key={i}
              type="button"
              disabled={revealed || selected !== null}
              onClick={() => setSelected(i)}
              aria-pressed={isPicked}
              className={cn(
                "flex w-full items-center gap-3 rounded-sm border border-border p-3 text-left text-base min-h-[44px]",
                "transition-colors duration-fast",
                !showState && "hover:bg-secondary hover:border-foreground/30",
                showState && isAnswer && "border-primary bg-primary/10 text-foreground",
                showState && isPicked && !isAnswer && "border-destructive bg-destructive/10",
                showState && !isAnswer && !isPicked && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium",
                  showState && isAnswer && "border-primary bg-primary text-primary-foreground",
                  showState && isPicked && !isAnswer && "border-destructive bg-destructive text-destructive-foreground",
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {showState && isAnswer && <Check className="h-4 w-4 text-primary" />}
              {showState && isPicked && !isAnswer && <X className="h-4 w-4 text-destructive" />}
            </button>
          );
        })}

        <div className="flex flex-col gap-3 pt-2">
          {!revealed && selected === null && (
            <Button size="sm" variant="outline" onClick={() => setRevealed(true)}>
              Reveal answer
            </Button>
          )}
          {showState && mcq.explanation && (
            <div className="rounded-sm border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {selected !== null && (isCorrect ? "Correct. " : "Not quite. ")}
              </span>
              {mcq.explanation}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
