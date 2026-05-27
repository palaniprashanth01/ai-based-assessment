"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function SummaryPanel({ summary, language }: { summary: string; language?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Summary
          {language && (
            <span className="ml-auto rounded-full border border-border px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider text-muted-foreground">
              {language}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-base leading-relaxed text-foreground/90">
          {summary.split(/\n+/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
