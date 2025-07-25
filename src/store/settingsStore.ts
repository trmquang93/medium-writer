import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { AIProviderType } from '@/types'
import { sessionManager } from '@/lib/session-manager'

interface SettingsState {
  // AI Provider settings
  selectedProvider: AIProviderType
  apiKeys: Record<AIProviderType, string>
  selectedModels: Record<AIProviderType, string>
  
  // API Key Persistence settings
  persistApiKeys: boolean
  persistentProviders: Record<AIProviderType, boolean>
  
  // User preferences
  autoAdvanceSteps: boolean
  showDetailedProgress: boolean
  preferredArticleLength: 'short' | 'medium' | 'long'
  
  // UI preferences
  theme: 'light' | 'dark' | 'auto'
  animationsEnabled: boolean
  soundEnabled: boolean
  
  // Actions
  setSelectedProvider: (provider: AIProviderType) => void
  setApiKey: (provider: AIProviderType, key: string) => void
  removeApiKey: (provider: AIProviderType) => void
  setSelectedModel: (provider: AIProviderType, model: string) => void
  getSelectedModel: (provider: AIProviderType) => string | undefined
  
  // Persistence actions
  setPersistApiKeys: (enabled: boolean) => void
  setProviderPersistence: (provider: AIProviderType, persistent: boolean) => void
  migrateProviderToPersistent: (provider: AIProviderType) => Promise<void>
  migrateProviderToSession: (provider: AIProviderType) => Promise<void>
  isProviderPersistent: (provider: AIProviderType) => boolean
  
  setAutoAdvanceSteps: (enabled: boolean) => void
  setShowDetailedProgress: (enabled: boolean) => void
  setPreferredArticleLength: (length: 'short' | 'medium' | 'long') => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  setAnimationsEnabled: (enabled: boolean) => void
  setSoundEnabled: (enabled: boolean) => void
  resetSettings: () => void
  
  // Session restoration
  restoreSession: () => void
  hasConfiguredProviders: () => boolean
}

const initialState = {
  selectedProvider: 'openai' as AIProviderType,
  apiKeys: {} as Record<AIProviderType, string>,
  selectedModels: {} as Record<AIProviderType, string>,
  persistApiKeys: false,
  persistentProviders: {} as Record<AIProviderType, boolean>,
  autoAdvanceSteps: true,
  showDetailedProgress: true,
  preferredArticleLength: 'medium' as const,
  theme: 'auto' as const,
  animationsEnabled: true,
  soundEnabled: false,
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        setSelectedProvider: (provider) => {
          set({ selectedProvider: provider })
          // Save session snapshot when provider changes
          sessionManager.saveSessionSnapshot({ selectedProvider: provider })
        },
        
        setApiKey: (provider, key) => {
          const apiKeys = { ...get().apiKeys, [provider]: key }
          set({ apiKeys })
        },
        
        removeApiKey: (provider) => {
          const apiKeys = { ...get().apiKeys }
          delete apiKeys[provider]
          set({ apiKeys })
        },
        
        setSelectedModel: (provider, model) => {
          const selectedModels = { ...get().selectedModels, [provider]: model }
          set({ selectedModels })
        },
        
        getSelectedModel: (provider) => {
          return get().selectedModels[provider]
        },
        
        // Persistence actions
        setPersistApiKeys: (enabled) => {
          set({ persistApiKeys: enabled })
          
          // Update API key manager persistence setting
          const { ApiKeyManager } = require('@/lib/api-key-manager')
          const manager = ApiKeyManager.getInstance()
          manager.setPersistenceEnabled(enabled)
        },
        
        setProviderPersistence: (provider, persistent) => {
          const persistentProviders = { ...get().persistentProviders, [provider]: persistent }
          set({ persistentProviders })
        },
        
        migrateProviderToPersistent: async (provider) => {
          try {
            const { ApiKeyManager } = require('@/lib/api-key-manager')
            const manager = ApiKeyManager.getInstance()
            await manager.migrateToPersistent(provider)
            
            // Update local state
            const persistentProviders = { ...get().persistentProviders, [provider]: true }
            set({ persistentProviders })
          } catch (error) {
            console.error('Failed to migrate provider to persistent:', error)
            throw error
          }
        },
        
        migrateProviderToSession: async (provider) => {
          try {
            const { ApiKeyManager } = require('@/lib/api-key-manager')
            const manager = ApiKeyManager.getInstance()
            await manager.migrateToSession(provider)
            
            // Update local state
            const persistentProviders = { ...get().persistentProviders, [provider]: false }
            set({ persistentProviders })
          } catch (error) {
            console.error('Failed to migrate provider to session:', error)
            throw error
          }
        },
        
        isProviderPersistent: (provider) => {
          return get().persistentProviders[provider] || false
        },
        
        setAutoAdvanceSteps: (enabled) => set({ autoAdvanceSteps: enabled }),
        
        setShowDetailedProgress: (enabled) => set({ showDetailedProgress: enabled }),
        
        setPreferredArticleLength: (length) => set({ preferredArticleLength: length }),
        
        setTheme: (theme) => set({ theme }),
        
        setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
        
        setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
        
        resetSettings: () => set(initialState),
        
        restoreSession: () => {
          // This will restore API keys from sessionStorage via ApiKeyManager
          // and sync them with the store state
          const { ApiKeyManager } = require('@/lib/api-key-manager')
          const manager = ApiKeyManager.getInstance()
          const configuredProviders = manager.getConfiguredProviders()
          
          // Update apiKeys state with available session keys
          const apiKeys = { ...get().apiKeys }
          configuredProviders.forEach(async (provider: AIProviderType) => {
            const key = await manager.getApiKey(provider)
            if (key) {
              apiKeys[provider] = key
            }
          })
          
          set({ apiKeys })
        },
        
        hasConfiguredProviders: () => {
          const { ApiKeyManager } = require('@/lib/api-key-manager')
          const manager = ApiKeyManager.getInstance()
          return manager.getConfiguredProviders().length > 0
        },
      }),
      {
        name: 'settings-state',
        partialize: (state) => ({
          selectedProvider: state.selectedProvider,
          selectedModels: state.selectedModels,
          persistApiKeys: state.persistApiKeys,
          persistentProviders: state.persistentProviders,
          autoAdvanceSteps: state.autoAdvanceSteps,
          showDetailedProgress: state.showDetailedProgress,
          preferredArticleLength: state.preferredArticleLength,
          theme: state.theme,
          animationsEnabled: state.animationsEnabled,
          soundEnabled: state.soundEnabled,
          // Note: API keys are handled by ApiKeyManager
          // Both session and persistent storage based on user preference
        }),
      }
    ),
    { name: 'settings-store' }
  )
)