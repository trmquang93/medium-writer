// Core Types for Medium AI Writing Assistant

export type AIProviderType = 'openai' | 'gemini' | 'anthropic' | 'openrouter'

export type CategoryType = 
  | 'TECHNOLOGY'
  | 'PERSONAL_DEVELOPMENT'
  | 'BUSINESS'
  | 'LIFESTYLE'
  | 'CURRENT_AFFAIRS'

export interface ContentCategory {
  primary: CategoryType
  secondary?: CategoryType
  confidence: number
  reasoning?: string
}

export interface Question {
  id: string
  text: string
  type: 'text' | 'select' | 'multiselect' | 'number'
  required: boolean
  options?: string[]
  placeholder?: string
  category: CategoryType
}

export interface Response {
  questionId: string
  question: string
  answer: string
  timestamp: Date
}

export interface Article {
  id: string
  title: string
  content: string
  category: ContentCategory
  metadata: ArticleMetadata
  generatedAt: Date
  modifiedAt?: Date
  wordCount?: number
  readingTime?: number
}

export interface ArticleMetadata {
  tags: string[]
  description?: string
  author?: string
  seoTitle?: string
  seoDescription?: string
  publishedUrl?: string
}

export interface GenerationSession {
  id: string
  userInput: string
  questions: Question[]
  responses: Response[]
  article?: Article
  provider: AIProviderType
  createdAt: Date
  completedAt?: Date
}

export interface UsageMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  lastUsed: Date
}

export interface ProviderConfig {
  name: string
  models: string[]
  baseUrl: string
  apiKeyFormat: RegExp
  maxTokens: number
  supportsStreaming: boolean
}

// Error Types
export interface APIError {
  code: string
  message: string
  provider?: AIProviderType
  details?: any
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

// UI State Types
export interface LoadingState {
  isLoading: boolean
  progress?: number
  status?: string
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

// Export Formats
export type ExportFormat = 'markdown' | 'html' | 'text' | 'json'

export interface ExportOptions {
  format: ExportFormat
  includeMetadata: boolean
  includeTimestamps: boolean
  filename?: string
}