"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const LANGUAGES = [
  { value: "auto", label: "Match source document" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi (हिन्दी)" },
  { value: "ta", label: "Tamil (தமிழ்)" },
  { value: "te", label: "Telugu (తెలుగు)" },
  { value: "bn", label: "Bengali (বাংলা)" },
  { value: "ar", label: "Arabic (العربية)" },
  { value: "th", label: "Thai (ไทย)" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese (简体)" },
  { value: "ja", label: "Japanese (日本語)" },
];

type Props = { value: string; onChange: (v: string) => void; disabled?: boolean };

export function LanguageSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor="lang">Output language</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="lang">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => (
            <SelectItem key={l.value} value={l.value}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
