"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BLOOM_LEVELS, type BloomLevel } from "@/lib/types";

type Props = { value: BloomLevel; onChange: (v: BloomLevel) => void; disabled?: boolean };

export function BloomSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor="bloom">Bloom&rsquo;s taxonomy level</Label>
      <Select value={value} onValueChange={(v) => onChange(v as BloomLevel)} disabled={disabled}>
        <SelectTrigger id="bloom">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BLOOM_LEVELS.map((b) => (
            <SelectItem key={b.value} value={b.value}>
              <div className="flex flex-col">
                <span className="font-medium">{b.label}</span>
                <span className="text-xs text-muted-foreground">{b.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
