import { AIProviderType, ProviderConfig, StoredApiKey, ApiKeyValidation, PersistenceSettings } from '@/types';
import { STORAGE_KEYS } from '@/constants';

export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private sessionKeys: Map<AIProviderType, string> = new Map();
  private encryptionKey: string | null = null;
  private persistentEncryptionKey: string | null = null;
  private persistenceSettings: PersistenceSettings | null = null;

  private constructor() {
    // Initialize encryption keys for both session and persistent storage
    this.initializeEncryption();
    this.loadPersistenceSettings();
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
    
    // Initialize persistent encryption key if persistence is enabled
    this.initializePersistentEncryption();
  }

  private initializePersistentEncryption(): void {
    try {
      // Generate or retrieve persistent encryption key based on browser fingerprint
      const fingerprint = this.generateBrowserFingerprint();
      this.persistentEncryptionKey = this.derivePersistentKey(fingerprint);
    } catch (error) {
      console.warn('Failed to initialize persistent encryption:', error);
      this.persistentEncryptionKey = null;
    }
  }

  private generateBrowserFingerprint(): string {
    // Only generate fingerprint in browser environment
    if (typeof window === 'undefined') {
      return 'server-fallback';
    }
    
    // Create a semi-stable browser fingerprint for encryption key derivation
    const elements = [
      navigator?.userAgent || 'unknown',
      navigator?.language || 'unknown',
      (typeof screen !== 'undefined' ? screen.width + 'x' + screen.height : 'unknown'),
      new Date().getTimezoneOffset().toString(),
      navigator?.hardwareConcurrency?.toString() || '0'
    ];
    
    // Simple hash function for fingerprint
    let hash = 0;
    const combined = elements.join('|');
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private derivePersistentKey(fingerprint: string): string {
    // Derive a persistent key from browser fingerprint
    // This is a simplified version - in production, consider using PBKDF2
    const seed = fingerprint + 'medium_ai_persistent_salt';
    let derived = '';
    for (let i = 0; i < 64; i++) {
      const char = seed.charCodeAt(i % seed.length);
      derived += (char + i).toString(16).padStart(2, '0');
    }
    return derived.substring(0, 64);
  }

  private loadPersistenceSettings(): void {
    // Only access localStorage in browser environment
    if (typeof window === 'undefined') {
      this.persistenceSettings = {
        enabled: false,
        providers: {} as Record<AIProviderType, boolean>,
        encryptionMethod: 'aes',
        createdAt: new Date(),
        lastModified: new Date()
      };
      return;
    }
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PERSISTENCE_SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.persistenceSettings = {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          lastModified: new Date(parsed.lastModified)
        };
      } else {
        // Initialize default settings
        this.persistenceSettings = {
          enabled: false,
          providers: {} as Record<AIProviderType, boolean>,
          encryptionMethod: 'aes',
          createdAt: new Date(),
          lastModified: new Date()
        };
      }
    } catch (error) {
      console.warn('Failed to load persistence settings:', error);
      this.persistenceSettings = {
        enabled: false,
        providers: {} as Record<AIProviderType, boolean>,
        encryptionMethod: 'aes',
        createdAt: new Date(),
        lastModified: new Date()
      };
    }
  }

  private generateSessionKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private async encrypt(text: string, persistent: boolean = false): Promise<string> {
    if (persistent) {
      return this.encryptPersistent(text);
    } else {
      return this.encryptSession(text);
    }
  }

  private async encryptSession(text: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Session encryption key not initialized');
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
      throw new Error('Failed to encrypt API key for session');
    }
  }

  private async encryptPersistent(text: string): Promise<string> {
    if (!this.persistentEncryptionKey) {
      throw new Error('Persistent encryption key not initialized');
    }

    try {
      // Generate a random salt for this encryption
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltHex = Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join('');
      
      // For simplicity, using enhanced XOR with salt
      // In production, consider using WebCrypto API for AES encryption
      const key = this.persistentEncryptionKey + saltHex;
      let encrypted = '';
      
      for (let i = 0; i < text.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const textChar = text.charCodeAt(i);
        encrypted += String.fromCharCode(textChar ^ keyChar);
      }
      
      // Prepend salt to encrypted data
      return saltHex + ':' + btoa(encrypted);
    } catch (error) {
      throw new Error('Failed to encrypt API key for persistent storage');
    }
  }

  private async decrypt(encryptedText: string, persistent: boolean = false): Promise<string> {
    if (persistent) {
      return this.decryptPersistent(encryptedText);
    } else {
      return this.decryptSession(encryptedText);
    }
  }

  private async decryptSession(encryptedText: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Session encryption key not initialized');
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
      throw new Error('Failed to decrypt API key from session');
    }
  }

  private async decryptPersistent(encryptedText: string): Promise<string> {
    if (!this.persistentEncryptionKey) {
      throw new Error('Persistent encryption key not initialized');
    }

    try {
      // Extract salt and encrypted data
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }
      
      const [saltHex, encryptedData] = parts;
      const encrypted = atob(encryptedData);
      const key = this.persistentEncryptionKey + saltHex;
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const encryptedChar = encrypted.charCodeAt(i);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }
      
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt persistent API key');
    }
  }

  /**
   * Store API key for the current session and optionally persist it
   */
  async setApiKey(provider: AIProviderType, apiKey: string, persistent: boolean = false): Promise<void> {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API key cannot be empty');
    }

    // Store in session memory
    this.sessionKeys.set(provider, apiKey);

    // Store encrypted in appropriate storage
    try {
      const encrypted = await this.encrypt(apiKey, persistent);
      const storedKey: StoredApiKey = {
        provider,
        key: encrypted,
        encrypted: true,
        persistent,
        lastUsed: new Date(),
        createdAt: new Date(),
        salt: persistent ? encrypted.split(':')[0] : undefined,
      };

      if (persistent && this.isPersistenceAllowed(provider)) {
        // Store in localStorage for persistence
        const existingPersistentKeys = this.getPersistentStoredKeys();
        existingPersistentKeys[provider] = storedKey;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.PERSISTENT_API_KEYS, JSON.stringify(existingPersistentKeys));
        }
        
        // Also update persistence settings
        if (this.persistenceSettings) {
          this.persistenceSettings.providers[provider] = true;
          this.persistenceSettings.lastModified = new Date();
          this.savePersistenceSettings();
        }
      } else {
        // Store in sessionStorage (existing behavior)
        const existingKeys = this.getStoredKeys();
        existingKeys[provider] = storedKey;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(existingKeys));
        }
      }
    } catch (error) {
      console.warn('Failed to store encrypted API key:', error);
      throw error;
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

    // Try to load from persistent storage first (if enabled)
    if (this.isPersistenceAllowed(provider)) {
      try {
        const persistentKeys = this.getPersistentStoredKeys();
        const persistentKey = persistentKeys[provider];
        
        if (persistentKey && persistentKey.encrypted && persistentKey.persistent) {
          const decrypted = await this.decrypt(persistentKey.key, true);
          // Validate the decrypted key is not empty or corrupted
          if (decrypted && decrypted.trim().length > 0) {
            this.sessionKeys.set(provider, decrypted);
            // Update last used timestamp
            persistentKey.lastUsed = new Date();
            persistentKeys[provider] = persistentKey;
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEYS.PERSISTENT_API_KEYS, JSON.stringify(persistentKeys));
            }
            return decrypted;
          } else {
            console.warn('Decrypted persistent API key is empty or corrupted for provider:', provider);
            // Remove corrupted key from persistent storage
            this.removePersistentApiKey(provider);
          }
        }
      } catch (error) {
        console.warn('Failed to load persistent API key for provider:', provider, error);
        // Remove corrupted key from persistent storage if decryption fails
        this.removePersistentApiKey(provider);
      }
    }

    // Fallback to session storage
    try {
      const storedKeys = this.getStoredKeys();
      const storedKey = storedKeys[provider];
      
      if (storedKey && storedKey.encrypted && !storedKey.persistent) {
        const decrypted = await this.decrypt(storedKey.key, false);
        // Validate the decrypted key is not empty or corrupted
        if (decrypted && decrypted.trim().length > 0) {
          this.sessionKeys.set(provider, decrypted);
          return decrypted;
        } else {
          console.warn('Decrypted session API key is empty or corrupted for provider:', provider);
          // Remove corrupted key from session storage
          this.removeApiKey(provider);
        }
      }
    } catch (error) {
      console.warn('Failed to load session API key for provider:', provider, error);
      // Remove corrupted key from session storage if decryption fails
      this.removeApiKey(provider);
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
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(storedKeys));
      }
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
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEYS.API_KEYS);
      }
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
    const persistentKeys = this.getPersistentStoredKeys();
    const persistentProviders = Object.keys(persistentKeys) as AIProviderType[];
    
    // Combine and deduplicate
    const allProviders = Array.from(new Set([...sessionProviders, ...storedProviders, ...persistentProviders]));
    return allProviders;
  }

  /**
   * Check if a provider has an API key configured
   */
  async hasApiKey(provider: AIProviderType): Promise<boolean> {
    // Check session memory first
    if (this.sessionKeys.has(provider)) {
      return true;
    }
    
    // Check if key exists and can be decrypted from storage
    try {
      const apiKey = await this.getApiKey(provider);
      return apiKey !== null && apiKey.trim().length > 0;
    } catch (error) {
      console.warn('Error checking API key for provider:', provider, error);
      return false;
    }
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
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEYS.API_KEYS);
      }
    } catch (error) {
      console.warn('Failed to cleanup session storage:', error);
    }
  }

  /**
   * Persistence Management Methods
   */
  
  setPersistenceEnabled(enabled: boolean): void {
    if (!this.persistenceSettings) return;
    
    this.persistenceSettings.enabled = enabled;
    this.persistenceSettings.lastModified = new Date();
    this.savePersistenceSettings();
  }

  isPersistenceEnabled(): boolean {
    return this.persistenceSettings?.enabled || false;
  }

  isPersistenceAllowed(provider: AIProviderType): boolean {
    return this.isPersistenceEnabled() && 
           (this.persistenceSettings?.providers[provider] || false);
  }

  async migrateToPersistent(provider: AIProviderType): Promise<void> {
    const apiKey = await this.getApiKey(provider);
    if (!apiKey) {
      throw new Error(`No API key found for provider: ${provider}`);
    }

    // Remove from session storage
    this.removeApiKey(provider);
    
    // Store as persistent
    await this.setApiKey(provider, apiKey, true);
  }

  async migrateToSession(provider: AIProviderType): Promise<void> {
    const apiKey = await this.getApiKey(provider);
    if (!apiKey) {
      throw new Error(`No API key found for provider: ${provider}`);
    }

    // Remove from persistent storage
    this.removePersistentApiKey(provider);
    
    // Store as session-only
    await this.setApiKey(provider, apiKey, false);
  }

  getPersistentProviders(): AIProviderType[] {
    if (!this.persistenceSettings) return [];
    
    return Object.entries(this.persistenceSettings.providers)
      .filter(([_, enabled]) => enabled)
      .map(([provider, _]) => provider as AIProviderType);
  }

  removePersistentApiKey(provider: AIProviderType): void {
    if (typeof window === 'undefined') return;
    
    try {
      const persistentKeys = this.getPersistentStoredKeys();
      delete persistentKeys[provider];
      localStorage.setItem(STORAGE_KEYS.PERSISTENT_API_KEYS, JSON.stringify(persistentKeys));
      
      // Update persistence settings
      if (this.persistenceSettings) {
        this.persistenceSettings.providers[provider] = false;
        this.persistenceSettings.lastModified = new Date();
        this.savePersistenceSettings();
      }
    } catch (error) {
      console.warn('Failed to remove persistent API key:', error);
    }
  }

  clearAllPersistentKeys(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(STORAGE_KEYS.PERSISTENT_API_KEYS);
      
      // Reset persistence settings
      if (this.persistenceSettings) {
        this.persistenceSettings.providers = {} as Record<AIProviderType, boolean>;
        this.persistenceSettings.lastModified = new Date();
        this.savePersistenceSettings();
      }
    } catch (error) {
      console.warn('Failed to clear persistent API keys:', error);
    }
  }

  private savePersistenceSettings(): void {
    if (!this.persistenceSettings || typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.PERSISTENCE_SETTINGS, JSON.stringify(this.persistenceSettings));
    } catch (error) {
      console.warn('Failed to save persistence settings:', error);
    }
  }

  private getPersistentStoredKeys(): Partial<Record<AIProviderType, StoredApiKey>> {
    if (typeof window === 'undefined') return {};
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PERSISTENT_API_KEYS);
      const keys = stored ? JSON.parse(stored) : {};
      
      // Convert date strings back to Date objects
      Object.values(keys).forEach((key: any) => {
        if (key.lastUsed) key.lastUsed = new Date(key.lastUsed);
        if (key.createdAt) key.createdAt = new Date(key.createdAt);
      });
      
      return keys;
    } catch (error) {
      console.warn('Failed to load persistent keys:', error);
      return {};
    }
  }

  private getStoredKeys(): Partial<Record<AIProviderType, StoredApiKey>> {
    if (typeof window === 'undefined') return {};
    
    try {
      const stored = sessionStorage.getItem(STORAGE_KEYS.API_KEYS);
      const keys = stored ? JSON.parse(stored) : {};
      
      // Convert date strings back to Date objects
      Object.values(keys).forEach((key: any) => {
        if (key.lastUsed) key.lastUsed = new Date(key.lastUsed);
        if (key.createdAt) key.createdAt = new Date(key.createdAt);
      });
      
      return keys;
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
          model: 'gemini-2.5-pro',
          models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
          maxTokens: 128000
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