import { BaseAIProvider, GenerationRequest, GenerationResponse, StreamChunk } from './base-provider';
import { UsageMetrics, AIProviderType } from '@/types';

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
  };

  constructor(apiKey: string, model?: string) {
    super('gemini' as AIProviderType, apiKey, model);
  }

  getDefaultModel(): string {
    return 'gemini-pro';
  }

  getDefaultBaseURL(): string {
    return 'https://generativelanguage.googleapis.com/v1beta';
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

  async generateContent(request: GenerationRequest): Promise<GenerationResponse> {
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

      if (!geminiResponse.candidates || geminiResponse.candidates.length === 0) {
        throw new Error('No content generated from Gemini API');
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
    this.usageMetrics.tokensUsed += tokens;
    
    if (isError) {
      this.usageMetrics.errorCount++;
    }

    // Calculate running average of response times
    const totalRequests = this.usageMetrics.requestCount;
    const currentAverage = this.usageMetrics.averageResponseTime;
    this.usageMetrics.averageResponseTime = 
      (currentAverage * (totalRequests - 1) + responseTime) / totalRequests;
  }
}