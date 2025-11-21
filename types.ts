
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

// Define the legal jurisdiction regions
export type LegalRegion = 'westbank' | 'gaza';

export interface OpenRouterModel {
  id: string;
  name: string;
  supportsImages: boolean;
}

// Define the allowed Legal Action Modes
// Added 'research' mode for the dedicated Legal Researcher agent
// Added 'interrogator' for fact-finding
// Added 'verifier' for legislative auditing
export type ActionMode = 'analysis' | 'loopholes' | 'drafting' | 'strategy' | 'research' | 'interrogator' | 'verifier';

// --- OCR & Analysis Types ---

export type AnalysisType = 'ai' | 'ocr';
export type AnalysisProvider = 'gemini' | 'openrouter';
export type AnalysisProcessState = 'idle' | 'running' | 'paused' | 'done';

export interface SelectedImage {
    id: string;
    file: File;
    dataUrl: string;
}

export interface AnalysisResult {
    isLoading: boolean;
    status: string | null;
    result: string | null;
    error: string | null;
    tags?: string[];
}

// --- Voice Dictation Types ---
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

// --- Inheritance Types ---
export type Religion = 'muslim' | 'christian';

export interface InheritanceInput {
    religion: Religion;
    estateValue: number;
    currency: string;
    
    // Heirs Counts
    husband: number; // 0 or 1
    wife: number; // 0 to 4
    son: number;
    daughter: number;
    father: number; // 0 or 1
    mother: number; // 0 or 1
    brotherFull: number; // Brother (Same parents)
    sisterFull: number;
    // We can add more extended family later (grandfather, etc.)
}

export interface HeirResult {
    type: string; // 'الزوجة', 'الابن', etc.
    count: number;
    shareFraction: string; // "1/8"
    sharePercentage: number; // 12.5
    amount: number; // Cash value
    notes?: string; // "لوجود الفرع الوارث"
}

export interface InheritanceResult {
    totalValue: number;
    heirs: HeirResult[];
    remainder?: number; // If any (Radd)
    isAwl?: boolean; // If shares > 1
}
