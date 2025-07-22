// Core AI Provider Types
export interface AIProvider {
  name: string;
  displayName: string;
  apiKey?: string;
  isValid: boolean;
}

export type AIProviderType = 'openai' | 'gemini' | 'claude' | 'openrouter';

// Content Category Types
export type ContentCategory = 
  | 'technology'
  | 'personal-development'
  | 'business'
  | 'lifestyle'
  | 'current-affairs';

export interface CategorySuggestion {
  primary: ContentCategory;
  secondary?: ContentCategory;
  confidence: number;
  reasoning: string;
}

// Article Generation Types
export interface GenerationRequest {
  userInput: string;
  category: CategorySuggestion;
  questions: Question[];
  responses: Response[];
  provider: AIProviderType;
  options: GenerationOptions;
}

export interface GenerationOptions {
  wordCount: number;
  tone: ArticleTone;
  format: ArticleFormat;
  includeOutline: boolean;
}

export type ArticleTone = 'professional' | 'casual' | 'academic' | 'conversational';
export type ArticleFormat = 'how-to' | 'listicle' | 'opinion' | 'personal-story' | 'tutorial';

// Question and Response Types
export interface Question {
  id: string;
  text: string;
  category: ContentCategory;
  required: boolean;
  type: 'text' | 'select' | 'multiselect';
  options?: string[];
}

export interface Response {
  questionId: string;
  answer: string;
  timestamp: Date;
}

// Article Types
export interface Article {
  id: string;
  title: string;
  content: string;
  category: CategorySuggestion;
  metadata: ArticleMetadata;
  generatedAt: Date;
  modifiedAt: Date;
  wordCount: number;
  readingTime: number;
}

export interface ArticleMetadata {
  tags: string[];
  metaDescription: string;
  seoScore: number;
  readabilityScore: number;
  keywords: string[];
}

// Session and State Types
export interface GenerationSession {
  id: string;
  userInput: string;
  categoryAnalysis?: CategorySuggestion;
  questions: Question[];
  responses: Response[];
  article?: Article;
  provider: AIProviderType;
  options: GenerationOptions;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionStatus = 
  | 'initializing'
  | 'analyzing-category'
  | 'generating-questions' 
  | 'collecting-responses'
  | 'generating-article'
  | 'completed'
  | 'error';

// Export Types
export type ExportFormat = 'markdown' | 'html' | 'text' | 'clipboard';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  includeSEO: boolean;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GenerationProgress {
  stage: SessionStatus;
  progress: number;
  message: string;
  estimatedTimeRemaining?: number;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// UI Component Types
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

// Provider-specific Types
export interface ProviderConfig {
  type: AIProviderType;
  apiKey: string;
  baseURL?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface UsageMetrics {
  tokensUsed: number;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
}