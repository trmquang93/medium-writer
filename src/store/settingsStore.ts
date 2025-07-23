import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { AIProviderType } from '@/types'

interface SettingsState {
  // AI Provider settings
  selectedProvider: AIProviderType
  apiKeys: Record<AIProviderType, string>
  selectedModels: Record<AIProviderType, string>
  
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
  setAutoAdvanceSteps: (enabled: boolean) => void
  setShowDetailedProgress: (enabled: boolean) => void
  setPreferredArticleLength: (length: 'short' | 'medium' | 'long') => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  setAnimationsEnabled: (enabled: boolean) => void
  setSoundEnabled: (enabled: boolean) => void
  resetSettings: () => void
}

const initialState = {
  selectedProvider: 'openai' as AIProviderType,
  apiKeys: {} as Record<AIProviderType, string>,
  selectedModels: {} as Record<AIProviderType, string>,
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
        
        setSelectedProvider: (provider) => set({ selectedProvider: provider }),
        
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
        
        setAutoAdvanceSteps: (enabled) => set({ autoAdvanceSteps: enabled }),
        
        setShowDetailedProgress: (enabled) => set({ showDetailedProgress: enabled }),
        
        setPreferredArticleLength: (length) => set({ preferredArticleLength: length }),
        
        setTheme: (theme) => set({ theme }),
        
        setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
        
        setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
        
        resetSettings: () => set(initialState),
      }),
      {
        name: 'settings-state',
        partialize: (state) => ({
          selectedProvider: state.selectedProvider,
          selectedModels: state.selectedModels,
          autoAdvanceSteps: state.autoAdvanceSteps,
          showDetailedProgress: state.showDetailedProgress,
          preferredArticleLength: state.preferredArticleLength,
          theme: state.theme,
          animationsEnabled: state.animationsEnabled,
          soundEnabled: state.soundEnabled,
        }),
      }
    ),
    { name: 'settings-store' }
  )
)