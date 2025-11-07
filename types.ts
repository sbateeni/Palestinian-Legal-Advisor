export type ApiSource = 'gemini' | 'openrouter';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Case {
  id: string;
  title: string;
  summary: string;
  createdAt: number;
  chatHistory: ChatMessage[];
}
