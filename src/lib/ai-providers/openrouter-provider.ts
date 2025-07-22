import { BaseAIProvider, GenerationRequest, GenerationResponse, StreamChunk } from './base-provider';
import { UsageMetrics, AIProviderType } from '@/types';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  transforms?: string[];
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

interface OpenRouterStreamResponse {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason?: string;
  }>;
  usage?: OpenRouterResponse['usage'];
}

export class OpenRouterProvider extends BaseAIProvider {
  private usageMetrics: UsageMetrics = {
    tokensUsed: 0,
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
  };

  constructor(apiKey: string, model?: string) {
    super('openrouter' as AIProviderType, apiKey, model);
  }

  getDefaultModel(): string {
    return 'openai/gpt-4-turbo-preview';
  }

  getDefaultBaseURL(): string {
    return 'https://openrouter.ai/api/v1';
  }

  protected createHeaders(): Record<string, string> {
    return {
      ...super.createHeaders(),
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://medium-ai-assistant.com',
      'X-Title': 'Medium AI Writing Assistant',
    };
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: this.createHeaders(),
        method: 'GET',
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async generateContent(request: GenerationRequest): Promise<GenerationResponse> {
    this.validateGenerationOptions(request.options);

    const startTime = Date.now();

    try {
      const openRouterRequest: OpenRouterRequest = {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        max_tokens: Math.min(4000, Math.ceil(request.options.wordCount * 1.5)),
        temperature: this.getTemperatureForTone(request.options.tone),
        transforms: ['middle-out'], // OpenRouter optimization
      };

      const response = await this.retryRequest(async () => {
        const res = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: this.createHeaders(),
          body: JSON.stringify(openRouterRequest),
        });

        if (!res.ok) {
          const error = await res.json();
          throw { response: { status: res.status, data: error } };
        }

        return res.json();
      });

      const openRouterResponse = response as OpenRouterResponse;
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(openRouterResponse.usage?.total_tokens || 0, responseTime, false);

      return {
        content: openRouterResponse.choices[0].message.content,
        usage: openRouterResponse.usage ? {
          promptTokens: openRouterResponse.usage.prompt_tokens,
          completionTokens: openRouterResponse.usage.completion_tokens,
          totalTokens: openRouterResponse.usage.total_tokens,
        } : undefined,
        model: openRouterResponse.model || this.model,
        finishReason: openRouterResponse.choices[0].finish_reason,
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
      const openRouterRequest: OpenRouterRequest = {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        max_tokens: Math.min(4000, Math.ceil(request.options.wordCount * 1.5)),
        temperature: this.getTemperatureForTone(request.options.tone),
        stream: true,
        transforms: ['middle-out'],
      };

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify(openRouterRequest),
      });

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
      let totalUsage: OpenRouterResponse['usage'] | undefined;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          const responseTime = Date.now() - startTime;
          this.updateMetrics(totalUsage?.total_tokens || 0, responseTime, false);
          
          yield {
            content: '',
            isComplete: true,
            usage: totalUsage ? {
              promptTokens: totalUsage.prompt_tokens,
              completionTokens: totalUsage.completion_tokens,
              totalTokens: totalUsage.total_tokens,
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
          
          if (data === '[DONE]') {
            const responseTime = Date.now() - startTime;
            this.updateMetrics(totalUsage?.total_tokens || 0, responseTime, false);
            
            yield {
              content: '',
              isComplete: true,
            };
            return;
          }

          try {
            const parsed: OpenRouterStreamResponse = JSON.parse(data);
            
            if (parsed.usage) {
              totalUsage = parsed.usage;
            }

            const deltaContent = parsed.choices[0]?.delta?.content || '';
            
            if (deltaContent) {
              yield {
                content: deltaContent,
                isComplete: false,
              };
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

  // Get available models from OpenRouter
  async getAvailableModels(): Promise<Array<{id: string; name: string; pricing: any}>> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: this.createHeaders(),
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available models');
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      return [];
    }
  }

  private getTemperatureForTone(tone: string): number {
    switch (tone) {
      case 'professional':
        return 0.3;
      case 'academic':
        return 0.2;
      case 'casual':
        return 0.7;
      case 'conversational':
        return 0.6;
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