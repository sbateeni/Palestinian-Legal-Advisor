
// FIX: Define shared types for the application.
export type Role = 'user' | 'model';

export interface GroundingMetadata {
  groundingChunks: {
    web?: {
      uri: string;
      title: string;
    };
  }[];
  groundingSupports?: {
    segment: {
      startIndex: number;
      endIndex: number;
    };
    groundingChunkIndices: number[];
    confidenceScores: number[];
  }[];
  webSearchQueries?: string[];
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  images?: { dataUrl: string; mimeType: string }[];
  model?: string; // Add model property to store which model generated the response
  // FIX: Add isError property to handle chat error messages.
  isError?: boolean;
  // Add grounding metadata for search sources
  groundingMetadata?: GroundingMetadata;
}

export type CaseStatus = 'جديدة' | 'قيد النظر' | 'مؤجلة' | 'مغلقة' | 'استئناف' | 'أخرى';

export interface Case {
  id: string;
  title: string;
  summary: string;
  chatHistory: ChatMessage[];
  createdAt: number;
  status: CaseStatus;
  pinnedMessages?: ChatMessage[];
}

export type ApiSource = 'gemini' | 'openrouter';

export interface OpenRouterModel {
  id: string;
  name: string;
  supportsImages: boolean;
}
