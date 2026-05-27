export type BloomLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";

export const BLOOM_LEVELS: { value: BloomLevel; label: string; description: string }[] = [
  { value: "remember", label: "Remember", description: "Recall facts and basic concepts" },
  { value: "understand", label: "Understand", description: "Explain ideas or concepts" },
  { value: "apply", label: "Apply", description: "Use information in new situations" },
  { value: "analyze", label: "Analyze", description: "Draw connections among ideas" },
  { value: "evaluate", label: "Evaluate", description: "Justify a stand or decision" },
  { value: "create", label: "Create", description: "Produce new or original work" },
];

export type MCQ = {
  question: string;
  options: string[];
  correctIndex: number;
  bloomLevel: BloomLevel;
  explanation?: string;
};

export type GraphNode = {
  id: string;
  label: string;
  type?: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  relation: string;
};

export type AssessmentResponse = {
  summary: string;
  mcqs: MCQ[];
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  detectedLanguage?: string;
  _model?: string;
  _totalPages?: number;
  _truncated?: boolean;
};

export type AssessmentRequest = {
  pdfBase64: string;
  bloomLevel: BloomLevel;
  numQuestions: number;
  language: string;
};
