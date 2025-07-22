import { BaseAIProvider, GenerationRequest, GenerationResponse, StreamChunk } from './base-provider';
import { UsageMetrics, AIProviderType } from '@/types';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface OpenAIResponse {
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

interface OpenAIStreamResponse {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason?: string;
  }>;
  usage?: OpenAIResponse['usage'];
}

export class OpenAIProvider extends BaseAIProvider {
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
    super('openai' as AIProviderType, apiKey, model);
  }

  getDefaultModel(): string {
    return 'gpt-4-turbo-preview';
  }

  getDefaultBaseURL(): string {
    return 'https://api.openai.com/v1';
  }

  protected createHeaders(): Record<string, string> {
    return {
      ...super.createHeaders(),
      'Authorization': `Bearer ${this.apiKey}`,
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
      const openAIRequest: OpenAIRequest = {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        max_tokens: Math.min(4000, Math.ceil(request.options.wordCount * 1.5)),
        temperature: this.getTemperatureForTone(request.options.tone),
      };

      const response = await this.retryRequest(async () => {
        const res = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: this.createHeaders(),
          body: JSON.stringify(openAIRequest),
        });

        if (!res.ok) {
          const error = await res.json();
          throw { response: { status: res.status, data: error } };
        }

        return res.json();
      });

      const openAIResponse = response as OpenAIResponse;
      const responseTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(openAIResponse.usage.total_tokens, responseTime, false);

      return {
        content: openAIResponse.choices[0].message.content,
        usage: {
          promptTokens: openAIResponse.usage.prompt_tokens,
          completionTokens: openAIResponse.usage.completion_tokens,
          totalTokens: openAIResponse.usage.total_tokens,
        },
        model: openAIResponse.model,
        finishReason: openAIResponse.choices[0].finish_reason,
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
    let accumulatedContent = '';

    try {
      const openAIRequest: OpenAIRequest = {
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
      };

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify(openAIRequest),
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

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('data: ')) continue;
          
          const data = line.slice(6); // Remove 'data: ' prefix
          
          if (data === '[DONE]') {
            const responseTime = Date.now() - startTime;
            this.updateMetrics(0, responseTime, false); // Token count not available in stream
            
            yield {
              content: '',
              isComplete: true,
            };
            return;
          }

          try {
            const parsed: OpenAIStreamResponse = JSON.parse(data);
            const deltaContent = parsed.choices[0]?.delta?.content || '';
            
            if (deltaContent) {
              accumulatedContent += deltaContent;
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