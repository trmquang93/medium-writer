// Core Types for Medium AI Writing Assistant

export type AIProviderType = 'openai' | 'gemini' | 'anthropic' | 'openrouter'

// Article formatting types
export type ArticleTone = 'professional' | 'casual' | 'academic' | 'conversational'
export type ArticleFormat = 'how-to' | 'listicle' | 'opinion' | 'personal-story' | 'tutorial' | 'analysis'

export type CategoryType = 
  | 'TECHNOLOGY'
  | 'PERSONAL_DEVELOPMENT'
  | 'BUSINESS'
  | 'LIFESTYLE'
  | 'CURRENT_AFFAIRS'
  | 'CREATIVE_WRITING'
  | 'EDUCATION_LEARNING'
  | 'ENTERTAINMENT_MEDIA'
  | 'SCIENCE_RESEARCH'

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
  tokensUsed: number
  requestCount: number
  errorCount: number
}

export interface ModelInfo {
  id: string
  name: string
  description: string
  maxTokens: number
  inputCostPer1000?: number
  outputCostPer1000?: number
  capabilities: string[]
  isDefault?: boolean
}

export interface ProviderConfig {
  type: AIProviderType
  name: string
  apiKey: string
  model?: string
  baseURL?: string
  models: string[]
  baseUrl: string
  apiKeyFormat: RegExp
  maxTokens: number
  supportsStreaming: boolean
  temperature?: number
  availableModels: ModelInfo[]
}

// Error Types
export interface APIError {
  code: string
  message: string
  provider?: AIProviderType
  details?: any
}

export interface AppError {
  code: string
  message: string
  details?: any
  timestamp?: Date
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

// Generation Options
export interface GenerationOptions {
  wordCount: number
  tone: ArticleTone
  format: ArticleFormat
  model?: string
  temperature?: number
  maxTokens?: number
}

// Export Formats
export type ExportFormat = 'markdown' | 'html' | 'text' | 'json' | 'clipboard'

export interface ExportOptions {
  format: ExportFormat
  includeMetadata: boolean
  includeTimestamps: boolean
  filename?: string
}