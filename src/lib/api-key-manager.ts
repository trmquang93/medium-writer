import { AIProviderType, ProviderConfig } from '@/types';
import { STORAGE_KEYS } from '@/constants';

export interface StoredApiKey {
  provider: AIProviderType;
  key: string;
  encrypted: boolean;
  lastUsed: Date;
}

export interface ApiKeyValidation {
  isValid: boolean;
  error?: string;
  provider: AIProviderType;
}

export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private sessionKeys: Map<AIProviderType, string> = new Map();
  private encryptionKey: string | null = null;

  private constructor() {
    // Initialize encryption key for session
    this.initializeEncryption();
  }

  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  private initializeEncryption(): void {
    // Create a session-specific encryption key
    // This key is only valid for the current session
    this.encryptionKey = this.generateSessionKey();
  }

  private generateSessionKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private async encrypt(text: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      // Simple XOR encryption for session storage
      // Note: This is not cryptographically secure for long-term storage
      // but suitable for session-only data
      const key = this.encryptionKey;
      let encrypted = '';
      
      for (let i = 0; i < text.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const textChar = text.charCodeAt(i);
        encrypted += String.fromCharCode(textChar ^ keyChar);
      }
      
      return btoa(encrypted);
    } catch (error) {
      throw new Error('Failed to encrypt API key');
    }
  }

  private async decrypt(encryptedText: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      const encrypted = atob(encryptedText);
      const key = this.encryptionKey;
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const encryptedChar = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }
      
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * Store API key for the current session
   */
  async setApiKey(provider: AIProviderType, apiKey: string): Promise<void> {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API key cannot be empty');
    }

    // Store in session memory
    this.sessionKeys.set(provider, apiKey);

    // Optionally store encrypted in session storage for persistence across page refreshes
    try {
      const encrypted = await this.encrypt(apiKey);
      const storedKey: StoredApiKey = {
        provider,
        key: encrypted,
        encrypted: true,
        lastUsed: new Date(),
      };

      const existingKeys = this.getStoredKeys();
      existingKeys[provider] = storedKey;
      
      sessionStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(existingKeys));
    } catch (error) {
      console.warn('Failed to store encrypted API key:', error);
    }
  }

  /**
   * Retrieve API key for a provider
   */
  async getApiKey(provider: AIProviderType): Promise<string | null> {
    // First check session memory
    const sessionKey = this.sessionKeys.get(provider);
    if (sessionKey) {
      return sessionKey;
    }

    // Try to load from session storage
    try {
      const storedKeys = this.getStoredKeys();
      const storedKey = storedKeys[provider];
      
      if (storedKey && storedKey.encrypted) {
        const decrypted = await this.decrypt(storedKey.key);
        this.sessionKeys.set(provider, decrypted);
        return decrypted;
      }
    } catch (error) {
      console.warn('Failed to load encrypted API key:', error);
    }

    return null;
  }

  /**
   * Remove API key for a provider
   */
  removeApiKey(provider: AIProviderType): void {
    this.sessionKeys.delete(provider);

    // Remove from session storage
    try {
      const storedKeys = this.getStoredKeys();
      delete storedKeys[provider];
      sessionStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(storedKeys));
    } catch (error) {
      console.warn('Failed to remove stored API key:', error);
    }
  }

  /**
   * Clear all API keys
   */
  clearAllKeys(): void {
    this.sessionKeys.clear();
    try {
      sessionStorage.removeItem(STORAGE_KEYS.API_KEYS);
    } catch (error) {
      console.warn('Failed to clear stored API keys:', error);
    }
  }

  /**
   * Get all configured providers
   */
  getConfiguredProviders(): AIProviderType[] {
    const sessionProviders = Array.from(this.sessionKeys.keys());
    const storedKeys = this.getStoredKeys();
    const storedProviders = Object.keys(storedKeys) as AIProviderType[];
    
    // Combine and deduplicate
    const allProviders = Array.from(new Set([...sessionProviders, ...storedProviders]));
    return allProviders;
  }

  /**
   * Check if a provider has an API key configured
   */
  hasApiKey(provider: AIProviderType): boolean {
    return this.sessionKeys.has(provider) || 
           this.getStoredKeys()[provider] !== undefined;
  }

  /**
   * Get provider configuration for AI provider initialization
   */
  async getProviderConfig(provider: AIProviderType): Promise<ProviderConfig | null> {
    const apiKey = await this.getApiKey(provider);
    if (!apiKey) {
      return null;
    }

    return {
      type: provider,
      apiKey,
      // Add default configurations based on provider type
      ...(this.getDefaultProviderConfig(provider)),
    } as ProviderConfig;
  }

  /**
   * Validate an API key by attempting to create and test a provider
   */
  async validateApiKey(provider: AIProviderType, apiKey: string): Promise<ApiKeyValidation> {
    try {
      // Temporarily create a provider config for validation
      const config: ProviderConfig = {
        type: provider,
        apiKey,
        ...this.getDefaultProviderConfig(provider),
      } as ProviderConfig;

      // Import the provider factory dynamically to avoid circular dependencies
      const { AIProviderFactory } = await import('./ai-providers/provider-factory');
      const isValid = await AIProviderFactory.validateProvider(config);

      return {
        isValid,
        provider,
      };
    } catch (error) {
      return {
        isValid: false,
        error: (error as Error).message,
        provider,
      };
    }
  }

  /**
   * Get session information
   */
  getSessionInfo(): {
    hasKeys: boolean;
    providerCount: number;
    providers: AIProviderType[];
    sessionId: string;
  } {
    return {
      hasKeys: this.sessionKeys.size > 0,
      providerCount: this.sessionKeys.size,
      providers: Array.from(this.sessionKeys.keys()),
      sessionId: this.encryptionKey?.substring(0, 8) || 'unknown',
    };
  }

  /**
   * Cleanup session data (called on session timeout or manual cleanup)
   */
  cleanup(): void {
    this.sessionKeys.clear();
    this.encryptionKey = null;
    
    try {
      sessionStorage.removeItem(STORAGE_KEYS.API_KEYS);
    } catch (error) {
      console.warn('Failed to cleanup session storage:', error);
    }
  }

  private getStoredKeys(): Partial<Record<AIProviderType, StoredApiKey>> {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEYS.API_KEYS);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  private getDefaultProviderConfig(provider: AIProviderType): Partial<ProviderConfig> {
    const baseConfig = {
      name: '',
      models: [],
      baseUrl: '',
      apiKeyFormat: /.+/,
      maxTokens: 4000,
      supportsStreaming: false,
    };

    switch (provider) {
      case 'openai':
        return { 
          ...baseConfig,
          name: 'OpenAI',
          model: 'gpt-4-turbo-preview',
          models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
          baseUrl: 'https://api.openai.com/v1',
          supportsStreaming: true
        };
      case 'gemini':
        return { 
          ...baseConfig,
          name: 'Google Gemini',
          model: 'gemini-pro',
          models: ['gemini-pro', 'gemini-pro-vision'],
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
          maxTokens: 8192
        };
      case 'anthropic':
        return { 
          ...baseConfig,
          name: 'Anthropic Claude',
          model: 'claude-3-sonnet-20240229',
          models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
          baseUrl: 'https://api.anthropic.com/v1',
          maxTokens: 4096
        };
      case 'openrouter':
        return { 
          ...baseConfig,
          name: 'OpenRouter',
          model: 'openai/gpt-4-turbo-preview',
          models: ['multiple'],
          baseUrl: 'https://openrouter.ai/api/v1'
        };
      default:
        return baseConfig;
    }
  }
}

// Export singleton instance
export const apiKeyManager = ApiKeyManager.getInstance();