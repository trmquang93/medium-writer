import { AIProviderType, GenerationOptions, UsageMetrics, AppError, ModelInfo } from '@/types';

export interface GenerationRequest {
  prompt: string;
  options: GenerationOptions;
  stream?: boolean;
}

export interface StructuredGenerationRequest<T = any> {
  prompt: string;
  schema?: T;
  prefill?: string;
  options: GenerationOptions;
  expectsJson?: boolean;
  maxRetries?: number;
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

export interface StructuredGenerationResponse<T = any> {
  data: T;
  raw: string;
  parsed: boolean;
  usage?: GenerationResponse['usage'];
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

  // New structured generation method
  async generateStructuredContent<T = any>(
    request: StructuredGenerationRequest<T>
  ): Promise<StructuredGenerationResponse<T>> {
    const maxRetries = request.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const generationRequest: GenerationRequest = {
          prompt: this.buildStructuredPrompt(request),
          options: request.options,
          stream: false
        };

        const response = await this.generateContent(generationRequest);
        const processed = await this.processStructuredResponse<T>(response.content, request);

        return {
          data: processed.data,
          raw: response.content,
          parsed: processed.success,
          usage: response.usage,
          model: response.model,
          finishReason: response.finishReason
        };
      } catch (error) {
        lastError = error as Error;
        console.warn(`Structured generation attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError || new Error('Structured generation failed after all retries');
  }

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

  // Build structured prompt with provider-specific prefilling
  protected buildStructuredPrompt<T>(request: StructuredGenerationRequest<T>): string {
    let prompt = request.prompt;
    
    if (request.expectsJson) {
      prompt += "\n\nIMPORTANT: Respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks. Return only the raw JSON object that matches the requested format.";
    }
    
    return prompt;
  }

  // Process structured response with unified JSON cleaning
  protected async processStructuredResponse<T>(
    content: string,
    request: StructuredGenerationRequest<T>
  ): Promise<{ data: T; success: boolean }> {
    if (!request.expectsJson) {
      return { data: content as T, success: true };
    }

    try {
      const cleaned = this.cleanJsonResponse(content);
      const parsed = JSON.parse(cleaned);
      return { data: parsed as T, success: true };
    } catch (error) {
      console.warn('JSON parsing failed, attempting fallback cleaning:', error);
      
      try {
        const fallbackCleaned = this.aggressiveJsonCleaning(content);
        const parsed = JSON.parse(fallbackCleaned);
        return { data: parsed as T, success: true };
      } catch (fallbackError) {
        console.warn('Aggressive cleaning failed, attempting truncation recovery:', fallbackError);
        
        try {
          const recoveredCleaned = this.recoverTruncatedJson(content);
          const parsed = JSON.parse(recoveredCleaned);
          return { data: parsed as T, success: true };
        } catch (recoveryError) {
          console.error('All JSON parsing attempts failed:', recoveryError);
          throw new Error(`Failed to parse JSON response: ${recoveryError}`);
        }
      }
    }
  }

  // Unified JSON cleaning pipeline
  protected cleanJsonResponse(content: string): string {
    let cleaned = content.trim();
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Extract JSON object/array from mixed content
    const jsonMatch = cleaned.match(/([\[\{][\s\S]*[\]\}])/);
    if (jsonMatch) {
      cleaned = jsonMatch[1];
    }
    
    return cleaned.trim();
  }

  // Aggressive JSON cleaning for difficult cases
  protected aggressiveJsonCleaning(content: string): string {
    let cleaned = content.trim();
    
    // Remove all non-JSON text before first { or [
    const startMatch = cleaned.search(/[\[\{]/);
    if (startMatch !== -1) {
      cleaned = cleaned.substring(startMatch);
    }
    
    // Remove all non-JSON text after last } or ]
    const endMatch = cleaned.lastIndexOf('}') !== -1 ? cleaned.lastIndexOf('}') : cleaned.lastIndexOf(']');
    if (endMatch !== -1) {
      cleaned = cleaned.substring(0, endMatch + 1);
    }
    
    // Remove common prefixes that AI models add
    const prefixes = [
      'Here is the JSON:',
      'The JSON response is:',
      'Response:',
      'Here\'s the analysis:',
      'Analysis:'
    ];
    
    for (const prefix of prefixes) {
      if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleaned = cleaned.substring(prefix.length).trim();
      }
    }
    
    return cleaned;
  }

  // Recover truncated JSON by attempting to complete incomplete structures
  protected recoverTruncatedJson(content: string): string {
    let cleaned = content.trim();
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Find the start of JSON
    const startMatch = cleaned.search(/[\[\{]/);
    if (startMatch !== -1) {
      cleaned = cleaned.substring(startMatch);
    }
    
    // If content appears to be truncated (doesn't end with } or ]), try to complete it
    if (cleaned.startsWith('{') && !cleaned.endsWith('}')) {
      // Look for incomplete string values and try to complete the JSON object
      const lastCompleteProperty = this.findLastCompleteProperty(cleaned);
      if (lastCompleteProperty !== -1) {
        cleaned = cleaned.substring(0, lastCompleteProperty) + '}';
      } else {
        // If we can't find any complete property, create a minimal valid object
        cleaned = '{"error":"Truncated response"}';
      }
    } else if (cleaned.startsWith('[') && !cleaned.endsWith(']')) {
      // Handle truncated arrays
      const lastCompleteItem = this.findLastCompleteArrayItem(cleaned);
      if (lastCompleteItem !== -1) {
        cleaned = cleaned.substring(0, lastCompleteItem) + ']';
      } else {
        cleaned = '[]';
      }
    }
    
    return cleaned;
  }

  // Find the last complete property in a truncated JSON object
  private findLastCompleteProperty(jsonStr: string): number {
    let braceCount = 0;
    let inString = false;
    let escaped = false;
    let lastCompleteIndex = -1;
    
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      if (char === '"' && !escaped) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        } else if ((char === ',' || char === '}') && braceCount === 1) {
          // Found a complete property
          lastCompleteIndex = i;
        }
      }
    }
    
    return lastCompleteIndex;
  }

  // Find the last complete item in a truncated JSON array
  private findLastCompleteArrayItem(jsonStr: string): number {
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escaped = false;
    let lastCompleteIndex = -1;
    
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      if (char === '"' && !escaped) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        } else if (char === '[') {
          bracketCount++;
        } else if (char === ']') {
          bracketCount--;
        } else if ((char === ',' || char === ']') && braceCount === 0 && bracketCount === 1) {
          // Found a complete array item
          lastCompleteIndex = i;
        }
      }
    }
    
    return lastCompleteIndex;
  }

  // Check if provider supports prefilling
  supportsPrefilling(): boolean {
    return false; // Override in specific providers
  }

  // Get provider info
  getInfo() {
    return {
      type: this.type,
      model: this.model,
      baseURL: this.baseURL,
      hasValidKey: Boolean(this.apiKey),
      availableModels: this.getAvailableModels(),
      supportsPrefilling: this.supportsPrefilling(),
    };
  }
}