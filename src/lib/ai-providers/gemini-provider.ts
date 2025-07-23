import { BaseAIProvider, GenerationRequest, GenerationResponse, StreamChunk, StructuredGenerationRequest } from './base-provider';
import { UsageMetrics, AIProviderType, ModelInfo } from '@/types';

interface GeminiContent {
  parts: Array<{ text: string }>;
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig: {
    maxOutputTokens: number;
    temperature: number;
    topP?: number;
    topK?: number;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: GeminiContent;
    finishReason: string;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiStreamResponse {
  candidates: Array<{
    content: GeminiContent;
    finishReason?: string;
  }>;
  usageMetadata?: GeminiResponse['usageMetadata'];
}

export class GeminiProvider extends BaseAIProvider {
  private usageMetrics: UsageMetrics = {
    tokensUsed: 0,
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastUsed: new Date(),
  };

  constructor(apiKey: string, model?: string) {
    super('gemini' as AIProviderType, apiKey, model);
  }

  getDefaultModel(): string {
    return 'gemini-2.5-pro';
  }

  getDefaultBaseURL(): string {
    return 'https://generativelanguage.googleapis.com/v1beta';
  }

  getAvailableModels(): ModelInfo[] {
    return [
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Google\'s most advanced AI model with superior reasoning capabilities',
        maxTokens: 1000000,
        inputCostPer1000: 0.00125, // $1.25 per 1M tokens (≤200k tokens)
        outputCostPer1000: 0.01, // $10.00 per 1M tokens (≤200k tokens)
        capabilities: ['text-generation', 'analysis', 'reasoning', 'long-context', 'advanced-reasoning', 'multimodal'],
        isDefault: true,
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Fast and efficient version of Gemini 2.5 with 1M context window',
        maxTokens: 1000000,
        inputCostPer1000: 0.0003, // $0.30 per 1M tokens
        outputCostPer1000: 0.0025, // $2.50 per 1M tokens
        capabilities: ['text-generation', 'conversation', 'fast-response', 'high-throughput', 'multimodal'],
      },
      {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        description: 'Ultra-fast and cost-effective version of Gemini 2.5',
        maxTokens: 128000,
        inputCostPer1000: 0.0001, // $0.10 per 1M tokens
        outputCostPer1000: 0.0004, // $0.40 per 1M tokens
        capabilities: ['text-generation', 'conversation', 'fast-response', 'cost-effective', 'multimodal'],
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        description: 'Balanced performance and cost with 1M context window',
        maxTokens: 1000000,
        inputCostPer1000: 0.0001, // $0.10 per 1M tokens
        outputCostPer1000: 0.0004, // $0.40 per 1M tokens
        capabilities: ['text-generation', 'conversation', 'fast-response', 'multimodal'],
      },
      {
        id: 'gemini-2.0-flash-lite',
        name: 'Gemini 2.0 Flash Lite',
        description: 'Most cost-effective option with reliable performance',
        maxTokens: 128000,
        inputCostPer1000: 0.000075, // $0.075 per 1M tokens
        outputCostPer1000: 0.0003, // $0.30 per 1M tokens
        capabilities: ['text-generation', 'conversation', 'fast-response', 'cost-effective'],
      },
    ];
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseURL}/models?key=${this.apiKey}`,
        {
          headers: this.createHeaders(),
          method: 'GET',
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Override structured prompt building for Gemini's format examples
  protected buildStructuredPrompt<T>(request: StructuredGenerationRequest<T>): string {
    let prompt = request.prompt;
    
    if (request.expectsJson) {
      prompt += "\n\nIMPORTANT: Respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks. Return only the raw JSON object that matches the requested format.";
      
      // Add examples for better JSON formatting with Gemini
      if (request.prefill) {
        prompt += `\n\nExample format: ${request.prefill}...`;
      }
    }
    
    return prompt;
  }

  // Enhanced generateContent with improved JSON handling
  async generateContent(request: GenerationRequest): Promise<GenerationResponse> {
    this.validateGenerationOptions(request.options);

    const startTime = Date.now();

    try {
      const structuredRequest = request as any as StructuredGenerationRequest;
      const finalPrompt = structuredRequest.expectsJson ? 
        this.buildStructuredPrompt(structuredRequest) : 
        request.prompt;
        
      const geminiRequest: GeminiRequest = {
        contents: [
          {
            parts: [{ text: finalPrompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: Math.min(8192, Math.max(2000, Math.ceil(request.options.wordCount * 2.5))),
          temperature: this.getTemperatureForTone(request.options.tone),
          topP: 0.8,
          topK: 40,
        },
      };

      const response = await this.retryRequest(async () => {
        const res = await fetch(
          `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: this.createHeaders(),
            body: JSON.stringify(geminiRequest),
          }
        );

        if (!res.ok) {
          const error = await res.json();
          throw { response: { status: res.status, data: error } };
        }

        return res.json();
      });

      const geminiResponse = response as GeminiResponse;
      const responseTime = Date.now() - startTime;

      console.log('Gemini API raw response:', JSON.stringify(geminiResponse, null, 2));

      if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
        throw new Error('No content generated from Gemini API');
      }

      if (!geminiResponse.candidates[0].content) {
        throw new Error('Invalid response structure from Gemini API');
      }

      // Handle case where parts might be missing (common with MAX_TOKENS finish reason)
      if (!geminiResponse.candidates[0].content.parts || geminiResponse.candidates[0].content.parts.length === 0) {
        if (geminiResponse.candidates[0].finishReason === 'MAX_TOKENS') {
          const thoughtsTokens = geminiResponse.usageMetadata?.thoughtsTokenCount || 0;
          const outputTokens = geminiResponse.usageMetadata?.candidatesTokenCount || 0;
          throw new Error(`Response truncated due to token limit. Thinking tokens: ${thoughtsTokens}, Output tokens: ${outputTokens}. Consider using a different model for structured generation.`);
        }
        throw new Error('No content parts in Gemini API response');
      }

      const content = geminiResponse.candidates[0].content.parts
        .map(part => part.text)
        .join('');

      // Update metrics
      this.updateMetrics(geminiResponse.usageMetadata?.totalTokenCount || 0, responseTime, false);

      return {
        content,
        usage: geminiResponse.usageMetadata ? {
          promptTokens: geminiResponse.usageMetadata.promptTokenCount,
          completionTokens: geminiResponse.usageMetadata.candidatesTokenCount,
          totalTokens: geminiResponse.usageMetadata.totalTokenCount,
        } : undefined,
        model: this.model,
        finishReason: geminiResponse.candidates[0].finishReason,
      };
    } catch (error) {
      this.updateMetrics(0, Date.now() - startTime, true);
      throw this.handleError(error);
    }
  }

  async *generateContentStream(
    request: GenerationRequest
  ): AsyncIterableIterator<StreamChunk> {
    this.validateGenerationOptions(request.options);

    const startTime = Date.now();

    try {
      const geminiRequest: GeminiRequest = {
        contents: [
          {
            parts: [{ text: request.prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: Math.min(8192, Math.ceil(request.options.wordCount * 1.5)),
          temperature: this.getTemperatureForTone(request.options.tone),
          topP: 0.8,
          topK: 40,
        },
      };

      const response = await fetch(
        `${this.baseURL}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: this.createHeaders(),
          body: JSON.stringify(geminiRequest),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw { response: { status: response.status, data: error } };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response stream reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let totalUsage: GeminiResponse['usageMetadata'] | undefined;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          const responseTime = Date.now() - startTime;
          this.updateMetrics(totalUsage?.totalTokenCount || 0, responseTime, false);
          
          yield {
            content: '',
            isComplete: true,
            usage: totalUsage ? {
              promptTokens: totalUsage.promptTokenCount,
              completionTokens: totalUsage.candidatesTokenCount,
              totalTokens: totalUsage.totalTokenCount,
            } : undefined,
          };
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('data: ')) continue;
          
          const data = line.slice(6); // Remove 'data: ' prefix
          
          try {
            const parsed: GeminiStreamResponse = JSON.parse(data);
            
            if (parsed.usageMetadata) {
              totalUsage = parsed.usageMetadata;
            }

            if (parsed.candidates && parsed.candidates.length > 0) {
              const content = parsed.candidates[0].content.parts
                .map(part => part.text)
                .join('');
              
              if (content) {
                yield {
                  content,
                  isComplete: parsed.candidates[0].finishReason === 'STOP',
                };
              }
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    } catch (error) {
      this.updateMetrics(0, Date.now() - startTime, true);
      throw this.handleError(error);
    }
  }

  async getUsageMetrics(): Promise<UsageMetrics> {
    return { ...this.usageMetrics };
  }

  private getTemperatureForTone(tone: string): number {
    switch (tone) {
      case 'professional':
        return 0.2;
      case 'academic':
        return 0.1;
      case 'casual':
        return 0.8;
      case 'conversational':
        return 0.7;
      default:
        return 0.5;
    }
  }

  private updateMetrics(tokens: number, responseTime: number, isError: boolean): void {
    this.usageMetrics.requestCount++;
    this.usageMetrics.totalRequests++;
    this.usageMetrics.tokensUsed += tokens;
    this.usageMetrics.lastUsed = new Date();
    
    if (isError) {
      this.usageMetrics.errorCount++;
      this.usageMetrics.failedRequests++;
    } else {
      this.usageMetrics.successfulRequests++;
    }

    // Calculate running average of response times
    const totalRequests = this.usageMetrics.requestCount;
    const currentAverage = this.usageMetrics.averageResponseTime;
    this.usageMetrics.averageResponseTime = 
      (currentAverage * (totalRequests - 1) + responseTime) / totalRequests;
  }
}