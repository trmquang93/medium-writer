import { BaseAIProvider, GenerationRequest, GenerationResponse, StreamChunk } from './base-provider';
import { UsageMetrics, AIProviderType } from '@/types';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  temperature?: number;
  stream?: boolean;
}

interface ClaudeResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
  stop_reason: string;
}

interface ClaudeStreamResponse {
  type: 'content_block_delta' | 'content_block_stop' | 'message_stop';
  delta?: {
    type: 'text_delta';
    text: string;
  };
  usage?: ClaudeResponse['usage'];
}

export class ClaudeProvider extends BaseAIProvider {
  private usageMetrics: UsageMetrics = {
    tokensUsed: 0,
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
  };

  constructor(apiKey: string, model?: string) {
    super('claude' as AIProviderType, apiKey, model);
  }

  getDefaultModel(): string {
    return 'claude-3-sonnet-20240229';
  }

  getDefaultBaseURL(): string {
    return 'https://api.anthropic.com/v1';
  }

  protected createHeaders(): Record<string, string> {
    return {
      ...super.createHeaders(),
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Claude doesn't have a dedicated endpoint for key validation
      // We'll try a minimal request instead
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });

      return response.ok || response.status === 400; // 400 might be expected for minimal request
    } catch (error) {
      return false;
    }
  }

  async generateContent(request: GenerationRequest): Promise<GenerationResponse> {
    this.validateGenerationOptions(request.options);

    const startTime = Date.now();

    try {
      const claudeRequest: ClaudeRequest = {
        model: this.model,
        max_tokens: Math.min(4096, Math.ceil(request.options.wordCount * 1.5)),
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        temperature: this.getTemperatureForTone(request.options.tone),
      };

      const response = await this.retryRequest(async () => {
        const res = await fetch(`${this.baseURL}/messages`, {
          method: 'POST',
          headers: this.createHeaders(),
          body: JSON.stringify(claudeRequest),
        });

        if (!res.ok) {
          const error = await res.json();
          throw { response: { status: res.status, data: error } };
        }

        return res.json();
      });

      const claudeResponse = response as ClaudeResponse;
      const responseTime = Date.now() - startTime;

      const content = claudeResponse.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');

      // Update metrics
      const totalTokens = claudeResponse.usage.input_tokens + claudeResponse.usage.output_tokens;
      this.updateMetrics(totalTokens, responseTime, false);

      return {
        content,
        usage: {
          promptTokens: claudeResponse.usage.input_tokens,
          completionTokens: claudeResponse.usage.output_tokens,
          totalTokens,
        },
        model: claudeResponse.model,
        finishReason: claudeResponse.stop_reason,
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
      const claudeRequest: ClaudeRequest = {
        model: this.model,
        max_tokens: Math.min(4096, Math.ceil(request.options.wordCount * 1.5)),
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
        temperature: this.getTemperatureForTone(request.options.tone),
        stream: true,
      };

      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify(claudeRequest),
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
      let totalUsage: ClaudeResponse['usage'] | undefined;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          const responseTime = Date.now() - startTime;
          const totalTokens = totalUsage 
            ? totalUsage.input_tokens + totalUsage.output_tokens 
            : 0;
          
          this.updateMetrics(totalTokens, responseTime, false);
          
          yield {
            content: '',
            isComplete: true,
            usage: totalUsage ? {
              promptTokens: totalUsage.input_tokens,
              completionTokens: totalUsage.output_tokens,
              totalTokens,
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
          
          if (data === '[DONE]') continue;

          try {
            const parsed: ClaudeStreamResponse = JSON.parse(data);
            
            if (parsed.usage) {
              totalUsage = parsed.usage;
            }

            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield {
                content: parsed.delta.text,
                isComplete: false,
              };
            } else if (parsed.type === 'message_stop') {
              // Message is complete
              yield {
                content: '',
                isComplete: true,
                usage: totalUsage ? {
                  promptTokens: totalUsage.input_tokens,
                  completionTokens: totalUsage.output_tokens,
                  totalTokens: totalUsage.input_tokens + totalUsage.output_tokens,
                } : undefined,
              };
              return;
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