import { AIProviderType, GenerationOptions, UsageMetrics, AppError, ModelInfo } from '@/types';

export interface GenerationRequest {
  prompt: string;
  options: GenerationOptions;
  stream?: boolean;
}

export interface GenerationResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
}

export interface StreamChunk {
  content: string;
  isComplete: boolean;
  usage?: GenerationResponse['usage'];
}

export abstract class BaseAIProvider {
  protected apiKey: string;
  protected baseURL: string;
  protected model: string;
  protected type: AIProviderType;

  constructor(
    type: AIProviderType,
    apiKey: string,
    model?: string,
    baseURL?: string
  ) {
    this.type = type;
    this.apiKey = apiKey;
    this.model = model || this.getDefaultModel();
    this.baseURL = baseURL || this.getDefaultBaseURL();
  }

  abstract getDefaultModel(): string;
  abstract getDefaultBaseURL(): string;
  abstract getAvailableModels(): ModelInfo[];
  abstract validateApiKey(): Promise<boolean>;

  abstract generateContent(
    request: GenerationRequest
  ): Promise<GenerationResponse>;

  abstract generateContentStream(
    request: GenerationRequest
  ): AsyncIterableIterator<StreamChunk>;

  abstract getUsageMetrics(): Promise<UsageMetrics>;

  // Model management methods
  setModel(model: string): void {
    if (this.isValidModel(model)) {
      this.model = model;
    } else {
      throw new Error(`Invalid model: ${model}. Available models: ${this.getAvailableModels().map(m => m.id).join(', ')}`);
    }
  }

  getCurrentModel(): string {
    return this.model;
  }

  private isValidModel(model: string): boolean {
    return this.getAvailableModels().some(m => m.id === model);
  }

  // Common utility methods
  protected createHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'Medium-AI-Writing-Assistant/1.0.0',
    };
  }

  protected handleError(error: any): AppError {
    const now = new Date();
    
    if (error.response) {
      // API responded with error status
      const status = error.response.status;
      const message = error.response.data?.error?.message || 'API request failed';
      
      switch (status) {
        case 401:
          return {
            code: 'INVALID_API_KEY',
            message: 'Invalid or expired API key',
            details: { provider: this.type, status },
            timestamp: now,
          };
        case 403:
          return {
            code: 'FORBIDDEN',
            message: 'Access forbidden - check API key permissions',
            details: { provider: this.type, status },
            timestamp: now,
          };
        case 429:
          return {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded - please try again later',
            details: { provider: this.type, status },
            timestamp: now,
          };
        case 500:
        case 502:
        case 503:
          return {
            code: 'PROVIDER_UNAVAILABLE',
            message: 'AI provider temporarily unavailable',
            details: { provider: this.type, status },
            timestamp: now,
          };
        default:
          return {
            code: 'API_ERROR',
            message: `API error: ${message}`,
            details: { provider: this.type, status, message },
            timestamp: now,
          };
      }
    } else if (error.request) {
      // Network error
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error - check your internet connection',
        details: { provider: this.type },
        timestamp: now,
      };
    } else {
      // Other error
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        details: { provider: this.type, error: error.toString() },
        timestamp: now,
      };
    }
  }

  protected buildPrompt(
    userInput: string,
    category: string,
    questions: Array<{ question: string; answer: string }>,
    options: GenerationOptions
  ): string {
    const { wordCount, tone, format } = options;

    const questionSection = questions.length > 0 
      ? `\n\nAdditional Context:\n${questions
          .map(q => `Q: ${q.question}\nA: ${q.answer}`)
          .join('\n\n')}`
      : '';

    return `You are an expert Medium article writer. Create a comprehensive, engaging article based on the following requirements:

TOPIC: ${userInput}

CATEGORY: ${category}

REQUIREMENTS:
- Target word count: ${wordCount} words (±10% is acceptable)
- Tone: ${tone}
- Format: ${format}
- Must be publication-ready for Medium platform
- Include proper heading hierarchy (H1, H2, H3)
- Engaging introduction that hooks the reader
- Clear, actionable content with examples where appropriate
- Strong conclusion with key takeaways
- Natural, flowing writing style

${questionSection}

Please create a complete article that meets these requirements. Format the output as follows:

# [Article Title]

[Article content with proper Medium formatting including headers, paragraphs, and any necessary formatting]

ARTICLE METADATA:
- Word Count: [actual word count]
- Reading Time: [estimated reading time in minutes]
- Primary Keywords: [3-5 relevant keywords]
- Suggested Tags: [3-5 Medium tags]

Ensure the article is engaging, informative, and ready for publication on Medium.`;
  }

  // Retry logic for failed requests
  protected async retryRequest<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on authentication errors
        if ((error as any).response?.status === 401 || (error as any).response?.status === 403) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, delay * Math.pow(2, attempt - 1))
        );
      }
    }

    throw lastError;
  }

  // Validate generation options
  protected validateGenerationOptions(options: GenerationOptions): void {
    if (options.wordCount < 300 || options.wordCount > 10000) {
      throw new Error('Word count must be between 300 and 10,000');
    }

    const validTones = ['professional', 'casual', 'academic', 'conversational'];
    if (!validTones.includes(options.tone)) {
      throw new Error(`Invalid tone. Must be one of: ${validTones.join(', ')}`);
    }

    const validFormats = ['how-to', 'listicle', 'opinion', 'personal-story', 'tutorial'];
    if (!validFormats.includes(options.format)) {
      throw new Error(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }
  }

  // Get provider info
  getInfo() {
    return {
      type: this.type,
      model: this.model,
      baseURL: this.baseURL,
      hasValidKey: Boolean(this.apiKey),
      availableModels: this.getAvailableModels(),
    };
  }
}