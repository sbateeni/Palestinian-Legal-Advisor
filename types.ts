// FIX: Define shared types for the application.
export type Role = 'user' | 'model';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  images?: { dataUrl: string; mimeType: string }[];
  model?: string; // Add model property to store which model generated the response
  // FIX: Add isError property to handle chat error messages.
  isError?: boolean;
}

export type CaseStatus = 'جديدة' | 'قيد النظر' | 'مؤجلة' | 'مغلقة' | 'استئناف' | 'أخرى';

export interface Case {
  id: string;
  title: string;
  summary: string;
  chatHistory: ChatMessage[];
  createdAt: number;
  status: CaseStatus;
}

export type ApiSource = 'gemini' | 'openrouter';