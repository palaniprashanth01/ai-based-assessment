import { SchemaType } from "@google/generative-ai";

export const ASSESSMENT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description: "Concise multi-paragraph summary of the document's key ideas.",
    },
    detectedLanguage: {
      type: SchemaType.STRING,
      description: "BCP-47 language code of the source document (e.g., 'en', 'hi', 'ta').",
    },
    mcqs: {
      type: SchemaType.ARRAY,
      description: "Multiple-choice questions targeting the requested Bloom's taxonomy level.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          question: { type: SchemaType.STRING },
          options: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Exactly four answer choices.",
          },
          correctIndex: {
            type: SchemaType.INTEGER,
            description: "Zero-based index of the correct option (0-3).",
          },
          bloomLevel: {
            type: SchemaType.STRING,
            enum: ["remember", "understand", "apply", "analyze", "evaluate", "create"],
          },
          explanation: {
            type: SchemaType.STRING,
            description: "Brief rationale for why the correct option is right.",
          },
        },
        required: ["question", "options", "correctIndex", "bloomLevel", "explanation"],
      },
    },
    graph: {
      type: SchemaType.OBJECT,
      description: "GraphRAG-style knowledge graph extracted from the document.",
      properties: {
        nodes: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING, description: "Stable kebab-case identifier." },
              label: { type: SchemaType.STRING, description: "Human-readable entity name." },
              type: {
                type: SchemaType.STRING,
                description: "Entity category (person, organization, concept, location, event, artifact).",
              },
            },
            required: ["id", "label", "type"],
          },
        },
        edges: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              source: { type: SchemaType.STRING },
              target: { type: SchemaType.STRING },
              relation: { type: SchemaType.STRING, description: "Short verb phrase describing the relationship." },
            },
            required: ["source", "target", "relation"],
          },
        },
      },
      required: ["nodes", "edges"],
    },
  },
  required: ["summary", "mcqs", "graph", "detectedLanguage"],
};
