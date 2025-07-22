import { AIProviderType, ProviderConfig } from '@/types';
import { BaseAIProvider } from './base-provider';
import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';
import { ClaudeProvider } from './claude-provider';
import { OpenRouterProvider } from './openrouter-provider';

export class AIProviderFactory {
  static createProvider(config: ProviderConfig): BaseAIProvider {
    const { type, apiKey, model, baseURL } = config;

    if (!apiKey) {
      throw new Error(`API key is required for ${type} provider`);
    }

    switch (type) {
      case 'openai':
        return new OpenAIProvider(apiKey, model);
        
      case 'gemini':
        return new GeminiProvider(apiKey, model);
        
      case 'anthropic':
        return new ClaudeProvider(apiKey, model);
        
      case 'openrouter':
        return new OpenRouterProvider(apiKey, model);
        
      default:
        throw new Error(`Unsupported AI provider type: ${type}`);
    }
  }

  static async validateProvider(config: ProviderConfig): Promise<boolean> {
    try {
      const provider = this.createProvider(config);
      return await provider.validateApiKey();
    } catch (error) {
      console.error(`Failed to validate ${config.type} provider:`, error);
      return false;
    }
  }

  static getDefaultConfig(type: AIProviderType): Partial<ProviderConfig> {
    switch (type) {
      case 'openai':
        return {
          model: 'gpt-4-turbo-preview',
          maxTokens: 4000,
          temperature: 0.7,
        };
        
      case 'gemini':
        return {
          model: 'gemini-pro',
          maxTokens: 8192,
          temperature: 0.7,
        };
        
      case 'anthropic':
        return {
          model: 'claude-3-sonnet-20240229',
          maxTokens: 4096,
          temperature: 0.7,
        };
        
      case 'openrouter':
        return {
          model: 'openai/gpt-4-turbo-preview',
          maxTokens: 4000,
          temperature: 0.7,
        };
        
      default:
        return {};
    }
  }

  static getSupportedProviders(): Array<{
    type: AIProviderType;
    name: string;
    description: string;
    requiresApiKey: boolean;
  }> {
    return [
      {
        type: 'openai',
        name: 'OpenAI',
        description: 'GPT-4 and GPT-3.5 models for high-quality content generation',
        requiresApiKey: true,
      },
      {
        type: 'gemini',
        name: 'Google Gemini',
        description: 'Google\'s advanced AI model with multimodal capabilities',
        requiresApiKey: true,
      },
      {
        type: 'anthropic',
        name: 'Anthropic Claude',
        description: 'Claude 3 models optimized for helpful, harmless content',
        requiresApiKey: true,
      },
      {
        type: 'openrouter',
        name: 'OpenRouter',
        description: 'Access to multiple AI models through a unified interface',
        requiresApiKey: true,
      },
    ];
  }
}

export class AIProviderManager {
  private providers: Map<AIProviderType, BaseAIProvider> = new Map();
  private activeProvider: AIProviderType | null = null;

  async addProvider(config: ProviderConfig): Promise<void> {
    const provider = AIProviderFactory.createProvider(config);
    
    // Validate the provider
    const isValid = await provider.validateApiKey();
    if (!isValid) {
      throw new Error(`Invalid API key for ${config.type} provider`);
    }

    this.providers.set(config.type, provider);
  }

  removeProvider(type: AIProviderType): void {
    this.providers.delete(type);
    
    if (this.activeProvider === type) {
      this.activeProvider = null;
    }
  }

  setActiveProvider(type: AIProviderType): void {
    if (!this.providers.has(type)) {
      throw new Error(`Provider ${type} is not configured`);
    }
    
    this.activeProvider = type;
  }

  getActiveProvider(): BaseAIProvider | null {
    if (!this.activeProvider) {
      return null;
    }
    
    return this.providers.get(this.activeProvider) || null;
  }

  getProvider(type: AIProviderType): BaseAIProvider | null {
    return this.providers.get(type) || null;
  }

  getAvailableProviders(): AIProviderType[] {
    return Array.from(this.providers.keys());
  }

  async validateAllProviders(): Promise<Record<AIProviderType, boolean>> {
    const results: Partial<Record<AIProviderType, boolean>> = {};
    
    for (const [type, provider] of Array.from(this.providers.entries())) {
      try {
        results[type] = await provider.validateApiKey();
      } catch (error) {
        results[type] = false;
      }
    }
    
    return results as Record<AIProviderType, boolean>;
  }

  async getUsageMetrics(): Promise<Record<AIProviderType, any>> {
    const metrics: Partial<Record<AIProviderType, any>> = {};
    
    for (const [type, provider] of Array.from(this.providers.entries())) {
      try {
        metrics[type] = await provider.getUsageMetrics();
      } catch (error) {
        metrics[type] = null;
      }
    }
    
    return metrics as Record<AIProviderType, any>;
  }

  // Auto-select the best available provider based on various factors
  autoSelectProvider(): AIProviderType | null {
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      return null;
    }

    // Priority order based on general performance and reliability
    const priorityOrder: AIProviderType[] = ['openai', 'anthropic', 'gemini', 'openrouter'];
    
    for (const preferredProvider of priorityOrder) {
      if (availableProviders.includes(preferredProvider)) {
        this.setActiveProvider(preferredProvider);
        return preferredProvider;
      }
    }

    // Fallback to first available provider
    const firstProvider = availableProviders[0];
    this.setActiveProvider(firstProvider);
    return firstProvider;
  }

  // Get provider recommendations based on content type
  getRecommendedProvider(contentCategory: string): AIProviderType | null {
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      return null;
    }

    // Content-specific recommendations
    const recommendations: Record<string, AIProviderType[]> = {
      'technology': ['openai', 'anthropic', 'gemini'],
      'business': ['anthropic', 'openai', 'gemini'],
      'personal-development': ['anthropic', 'openai', 'gemini'],
      'lifestyle': ['openai', 'gemini', 'anthropic'],
      'current-affairs': ['anthropic', 'openai', 'gemini'],
    };

    const preferred = recommendations[contentCategory] || recommendations['technology'];
    
    for (const provider of preferred) {
      if (availableProviders.includes(provider)) {
        return provider;
      }
    }

    return availableProviders[0];
  }
}