import type { BloomLevel } from "./types";
import { SCHEMA_DESCRIPTION } from "./schema";

const BLOOM_GUIDANCE: Record<BloomLevel, string> = {
  remember: "Test recall of explicit facts, definitions, names, and dates stated in the document.",
  understand: "Test comprehension — paraphrasing, classifying, or explaining ideas in the learner's own words.",
  apply: "Test application — use the document's principles to solve a new but related problem or scenario.",
  analyze: "Test analysis — distinguish parts, identify cause/effect, compare and contrast, infer relationships.",
  evaluate: "Test judgment — appraise, critique, or justify a position based on criteria from the document.",
  create: "Test synthesis — produce a novel combination, hypothesis, or design rooted in document concepts.",
};

/**
 * System-style instruction used by the Groq Llama call. The actual document
 * text is appended as a second user message in the route handler.
 */
export function buildPrompt(args: {
  bloomLevel: BloomLevel;
  numQuestions: number;
  language: string;
}) {
  const langLine =
    args.language === "auto"
      ? "Write the summary, questions, options, and explanations in the SAME language as the document text."
      : `Write the summary, questions, options, and explanations in language code '${args.language}'. Translate from the source if needed; preserve proper nouns.`;

  return `You are an expert pedagogy assistant. You will receive the extracted text of a document and produce a structured assessment.

Bloom's taxonomy level: **${args.bloomLevel.toUpperCase()}**
Guidance: ${BLOOM_GUIDANCE[args.bloomLevel]}

Produce exactly ${args.numQuestions} multiple-choice questions. Each MCQ must:
- Have exactly 4 options, only one correct.
- Place the correct answer at a randomized index (do not always put it first).
- Distractors should be plausible — drawn from related concepts in the document, common misconceptions, or near-miss phrasings. Avoid trivially wrong options.
- Match the requested Bloom level. Do not mix levels.
- Include a brief explanation citing the source idea.

Also produce:
1. A 3–5 paragraph summary capturing the document's main thesis, supporting evidence, and conclusions.
2. A knowledge graph (GraphRAG-style):
   - Nodes: salient entities, concepts, people, organizations, events, artifacts. Use stable kebab-case ids.
   - "type" must be one of: person, organization, concept, location, event, artifact.
   - Edges: directed relationships expressed as short verb phrases (e.g., "developed", "is part of", "contradicts", "depends on").
   - Aim for 10–25 nodes and 15–40 edges depending on document size. Capture meaningful relations, not co-occurrence.
   - Every edge.source and edge.target MUST reference an existing node.id.

${langLine}

OUTPUT FORMAT — return ONLY a JSON object matching this shape exactly. No prose, no markdown fences, no commentary:

${SCHEMA_DESCRIPTION}`;
}
