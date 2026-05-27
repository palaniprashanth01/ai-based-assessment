import { z } from "zod";

/**
 * Runtime validator for Groq responses. Groq's `response_format: json_object`
 * guarantees valid JSON, not a specific shape, so we validate ourselves and
 * surface a clear error if the model drifts off-schema.
 */
export const AssessmentSchema = z.object({
  summary: z.string().min(1),
  detectedLanguage: z.string().optional().default("en"),
  mcqs: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string()).length(4),
        correctIndex: z.number().int().min(0).max(3),
        bloomLevel: z.enum(["remember", "understand", "apply", "analyze", "evaluate", "create"]),
        explanation: z.string().default(""),
      }),
    )
    .min(1),
  graph: z.object({
    nodes: z.array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        type: z.string().default("concept"),
      }),
    ),
    edges: z.array(
      z.object({
        source: z.string().min(1),
        target: z.string().min(1),
        relation: z.string().min(1),
      }),
    ),
  }),
});

export type AssessmentParsed = z.infer<typeof AssessmentSchema>;

/**
 * The same shape, expressed as a string the LLM can read. Embedded into the
 * prompt so Llama produces JSON in exactly this layout. Keep this in sync
 * with AssessmentSchema above.
 */
export const SCHEMA_DESCRIPTION = `{
  "summary": string,                         // 3-5 paragraphs, single string with \\n between paragraphs
  "detectedLanguage": string,                // BCP-47 code, e.g. "en", "hi", "ta"
  "mcqs": [
    {
      "question": string,
      "options": [string, string, string, string],     // exactly 4
      "correctIndex": integer,                          // 0-3
      "bloomLevel": "remember"|"understand"|"apply"|"analyze"|"evaluate"|"create",
      "explanation": string                             // 1-2 sentences
    }
  ],
  "graph": {
    "nodes": [ { "id": string, "label": string, "type": string } ],
    "edges": [ { "source": string, "target": string, "relation": string } ]
  }
}`;
