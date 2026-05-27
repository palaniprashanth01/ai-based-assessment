import type { BloomLevel } from "./types";

const BLOOM_GUIDANCE: Record<BloomLevel, string> = {
  remember: "Test recall of explicit facts, definitions, names, and dates stated in the document.",
  understand: "Test comprehension — paraphrasing, classifying, or explaining ideas in the learner's own words.",
  apply: "Test application — use the document's principles to solve a new but related problem or scenario.",
  analyze: "Test analysis — distinguish parts, identify cause/effect, compare and contrast, infer relationships.",
  evaluate: "Test judgment — appraise, critique, or justify a position based on criteria from the document.",
  create: "Test synthesis — produce a novel combination, hypothesis, or design rooted in document concepts.",
};

export function buildPrompt(args: {
  bloomLevel: BloomLevel;
  numQuestions: number;
  language: string;
}) {
  const langLine =
    args.language === "auto"
      ? "Write the summary, questions, options, and explanations in the SAME language as the source document."
      : `Write the summary, questions, options, and explanations in language '${args.language}' (translate from the source if needed). Preserve proper nouns.`;

  return `You are an expert pedagogy assistant. Read the attached PDF (use vision OCR if it is scanned) and produce a structured assessment.

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
   - Edges: directed relationships expressed as short verb phrases (e.g., "developed", "is part of", "contradicts", "depends on").
   - Aim for 10–30 nodes and 15–50 edges depending on document size. Avoid trivial co-occurrence edges; capture meaningful relations only.

${langLine}

Return ONLY the JSON object matching the schema. No prose, no markdown fences.`;
}
