import { BaseAIProvider, GenerationRequest, GenerationResponse, StreamChunk } from './base-provider';
import { UsageMetrics, AIProviderType, ModelInfo } from '@/types';

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
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastUsed: new Date(),
  };

  private static cachedModels: ModelInfo[] | null = null;
  private static cacheExpiry: number = 0;
  private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor(apiKey: string, model?: string) {
    super('openrouter' as AIProviderType, apiKey, model);
  }

  getDefaultModel(): string {
    return 'openai/gpt-4-turbo-preview';
  }

  getDefaultBaseURL(): string {
    return 'https://openrouter.ai/api/v1';
  }

  getAvailableModels(): ModelInfo[] {
    // Return cached models if still valid
    if (OpenRouterProvider.cachedModels && Date.now() < OpenRouterProvider.cacheExpiry) {
      return OpenRouterProvider.cachedModels;
    }

    // Return fallback models if cache is expired (async fetch will update cache)
    this.refreshModelCache();
    return this.getFallbackModels();
  }

  private getFallbackModels(): ModelInfo[] {
    return [
      {
        id: 'openai/gpt-4-turbo-preview',
        name: 'GPT-4 Turbo Preview',
        description: 'OpenAI GPT-4 Turbo via OpenRouter',
        maxTokens: 128000,
        inputCostPer1000: 0.01,
        outputCostPer1000: 0.03,
        capabilities: ['text-generation', 'analysis', 'reasoning'],
        isDefault: true,
      },
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Anthropic Claude 3 Opus via OpenRouter',
        maxTokens: 200000,
        inputCostPer1000: 0.015,
        outputCostPer1000: 0.075,
        capabilities: ['text-generation', 'analysis', 'complex-reasoning'],
      },
      {
        id: 'anthropic/claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Anthropic Claude 3 Sonnet via OpenRouter',
        maxTokens: 200000,
        inputCostPer1000: 0.003,
        outputCostPer1000: 0.015,
        capabilities: ['text-generation', 'analysis', 'reasoning'],
      },
      {
        id: 'google/gemini-pro',
        name: 'Gemini Pro',
        description: 'Google Gemini Pro via OpenRouter',
        maxTokens: 32768,
        inputCostPer1000: 0.0005,
        outputCostPer1000: 0.0015,
        capabilities: ['text-generation', 'analysis', 'reasoning'],
      },
      {
        id: 'meta-llama/llama-2-70b-chat',
        name: 'Llama 2 70B Chat',
        description: 'Meta Llama 2 70B model optimized for chat',
        maxTokens: 4096,
        inputCostPer1000: 0.0007,
        outputCostPer1000: 0.0009,
        capabilities: ['text-generation', 'conversation'],
      },
      {
        id: 'mistralai/mistral-7b-instruct',
        name: 'Mistral 7B Instruct',
        description: 'Efficient Mistral model for instructions',
        maxTokens: 32768,
        inputCostPer1000: 0.0001,
        outputCostPer1000: 0.0001,
        capabilities: ['text-generation', 'instructions', 'fast-response'],
      },
    ];
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

  // Refresh model cache asynchronously
  private async refreshModelCache(): Promise<void> {
    try {
      const models = await this.fetchModelsFromAPI();
      OpenRouterProvider.cachedModels = models;
      OpenRouterProvider.cacheExpiry = Date.now() + OpenRouterProvider.CACHE_DURATION;
    } catch (error) {
      console.warn('Failed to refresh OpenRouter model cache:', error);
      // Keep using fallback models
    }
  }

  // Get available models from OpenRouter API and convert to ModelInfo format
  private async fetchModelsFromAPI(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: this.createHeaders(),
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available models');
      }

      const data = await response.json();
      const rawModels = data.data || [];

      // Convert OpenRouter API response to ModelInfo format
      const convertedModels: ModelInfo[] = rawModels
        .filter((model: any) => this.shouldIncludeModel(model))
        .map((model: any) => this.convertToModelInfo(model))
        .sort((a: ModelInfo, b: ModelInfo) => {
          // Sort by popularity/preference
          const preferredOrder = [
            'openai/gpt-4-turbo-preview',
            'openai/gpt-4',
            'anthropic/claude-3-opus',
            'anthropic/claude-3-sonnet',
            'anthropic/claude-3-haiku',
            'google/gemini-pro',
            'meta-llama/llama-2-70b-chat'
          ];
          
          const aIndex = preferredOrder.indexOf(a.id);
          const bIndex = preferredOrder.indexOf(b.id);
          
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          
          return a.name.localeCompare(b.name);
        });

      return convertedModels;
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
      return this.getFallbackModels();
    }
  }

  private shouldIncludeModel(model: any): boolean {
    // Filter out models that aren't suitable for content generation
    const excludedIds = [
      'openai/whisper-1', // Audio transcription
      'openai/dall-e-3', // Image generation
      'stability-ai/', // Image models
      'midjourney/', // Image models
    ];

    const modelId = model.id || '';
    
    // Exclude image/audio models
    if (excludedIds.some(excluded => modelId.startsWith(excluded))) {
      return false;
    }

    // Include only text generation models that are not deprecated
    return !modelId.includes('deprecated') && 
           !modelId.includes('beta') &&
           model.context_length > 0;
  }

  private convertToModelInfo(model: any): ModelInfo {
    const capabilities = this.determineCapabilities(model);
    const pricing = model.pricing || {};
    
    return {
      id: model.id,
      name: this.formatModelName(model.name || model.id),
      description: model.description || `${model.name || model.id} via OpenRouter`,
      maxTokens: model.context_length || 4096,
      inputCostPer1000: pricing.prompt ? parseFloat(pricing.prompt) * 1000 : undefined,
      outputCostPer1000: pricing.completion ? parseFloat(pricing.completion) * 1000 : undefined,
      capabilities,
      isDefault: model.id === 'openai/gpt-4-turbo-preview',
    };
  }

  private formatModelName(name: string): string {
    // Clean up model names for better display
    return name
      .replace(/\(OpenRouter\)/gi, '')
      .replace(/via OpenRouter/gi, '')
      .trim();
  }

  private determineCapabilities(model: any): string[] {
    const capabilities: string[] = ['text-generation'];
    const modelId = model.id?.toLowerCase() || '';
    const modelName = model.name?.toLowerCase() || '';
    
    // Add capabilities based on model type
    if (modelId.includes('gpt-4') || modelId.includes('claude-3-opus')) {
      capabilities.push('complex-reasoning', 'analysis');
    } else if (modelId.includes('claude-3')) {
      capabilities.push('analysis', 'reasoning');
    } else if (modelId.includes('gemini')) {
      capabilities.push('analysis', 'reasoning');
    } else if (modelId.includes('llama') || modelId.includes('mistral')) {
      capabilities.push('conversation');
    }

    // Add performance indicators
    if (modelId.includes('turbo') || modelId.includes('flash') || modelId.includes('7b')) {
      capabilities.push('fast-response');
    }

    if (model.context_length > 32000) {
      capabilities.push('long-context');
    }

    return capabilities;
  }

  // Legacy method for backward compatibility
  async getRemoteAvailableModels(): Promise<Array<{id: string; name: string; pricing: any}>> {
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