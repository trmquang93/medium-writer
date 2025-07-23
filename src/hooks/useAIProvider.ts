import { useState, useCallback, useEffect } from 'react'
import { AIProviderType, ContentCategory, Question, Article } from '@/types'
import { useSettingsStore } from '@/store/settingsStore'
import { ApiKeyManager } from '@/lib/api-key-manager'

interface OptimizationOptions {
  focus: 'seo' | 'readability' | 'engagement' | 'clarity'
  targetLength?: number
  tone?: 'professional' | 'casual' | 'academic'
}

interface UseAIProviderReturn {
  isConfigured: boolean
  isValidating: boolean
  validateApiKey: (provider: AIProviderType, key: string) => Promise<boolean>
  analyzeCategory: (input: string) => Promise<ContentCategory>
  generateQuestions: (input: string, category: ContentCategory) => Promise<Question[]>
  generateArticle: (
    input: string, 
    category: ContentCategory, 
    responses: { question: string; answer: string }[]
  ) => Promise<Article>
  optimizeContent: (content: string, options: OptimizationOptions) => Promise<string>
  setApiKey: (provider: AIProviderType, key: string) => void
  removeApiKey: (provider: AIProviderType) => void
}

export const useAIProvider = (): UseAIProviderReturn => {
  const { 
    selectedProvider, 
    apiKeys, 
    selectedModels,
    getSelectedModel,
    setApiKey: setStoreApiKey, 
    removeApiKey: removeStoreApiKey 
  } = useSettingsStore()
  const [isValidating, setIsValidating] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)

  // Helper function to get API key from either store or session manager
  const getApiKey = useCallback(async (provider: AIProviderType): Promise<string | null> => {
    // First check Zustand store
    const storeKey = apiKeys[provider]
    if (storeKey) return storeKey
    
    // Then check ApiKeyManager session storage
    return await ApiKeyManager.getInstance().getApiKey(provider)
  }, [apiKeys])

  // Check if the current provider is configured
  useEffect(() => {
    const checkConfiguration = async () => {
      // Check both Zustand store and ApiKeyManager for API keys
      const storeKey = !!apiKeys[selectedProvider]
      const sessionKey = await ApiKeyManager.getInstance().getApiKey(selectedProvider)
      const keyExists = storeKey || !!sessionKey
      setIsConfigured(keyExists)
    }
    
    checkConfiguration()
  }, [selectedProvider, apiKeys])

  const validateApiKey = useCallback(async (provider: AIProviderType, key: string): Promise<boolean> => {
    setIsValidating(true)
    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key })
      })
      
      const result = await response.json()
      return result.valid
    } catch (error) {
      console.error('API key validation failed:', error)
      return false
    } finally {
      setIsValidating(false)
    }
  }, [])

  const analyzeCategory = useCallback(async (input: string): Promise<ContentCategory> => {
    const apiKey = await getApiKey(selectedProvider)
    if (!apiKey) {
      throw new Error('No API key configured for selected provider')
    }

    const selectedModel = getSelectedModel(selectedProvider)
    
    // Create AbortController for request cancellation
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, 30000) // 30 second timeout for category analysis

    try {
      const response = await fetch('/api/analyze-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input, 
          provider: selectedProvider,
          model: selectedModel,
          apiKey 
        }),
        signal: abortController.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || 'Failed to analyze category')
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Category analysis timed out. Please try again.')
      }
      throw error
    }
  }, [selectedProvider, getApiKey])

  const generateQuestions = useCallback(async (
    input: string, 
    category: ContentCategory
  ): Promise<Question[]> => {
    const apiKey = await getApiKey(selectedProvider)
    if (!apiKey) {
      throw new Error('No API key configured for selected provider')
    }

    const selectedModel = getSelectedModel(selectedProvider)
    
    // Create AbortController for request cancellation
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, 30000) // 30 second timeout for question generation

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input, 
          category,
          provider: selectedProvider,
          model: selectedModel,
          apiKey 
        }),
        signal: abortController.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || 'Failed to generate questions')
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Question generation timed out. Please try again.')
      }
      throw error
    }
  }, [selectedProvider, getApiKey])

  const generateArticle = useCallback(async (
    input: string,
    category: ContentCategory,
    responses: { question: string; answer: string }[]
  ): Promise<Article> => {
    const apiKey = await getApiKey(selectedProvider)
    if (!apiKey) {
      throw new Error('No API key configured for selected provider')
    }

    const selectedModel = getSelectedModel(selectedProvider)
    
    // Create AbortController for request cancellation
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, 60000) // 60 second timeout

    try {
      const response = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input, 
          category,
          responses,
          provider: selectedProvider,
          model: selectedModel,
          apiKey 
        }),
        signal: abortController.signal
      })

      // Clear timeout if request completes
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || `Request failed with status ${response.status}`)
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Article generation timed out after 60 seconds. Please try again or check your internet connection.')
        }
        throw error
      }
      throw new Error('Failed to generate article')
    }
  }, [selectedProvider, getApiKey])

  const optimizeContent = useCallback(async (
    content: string,
    options: OptimizationOptions
  ): Promise<string> => {
    const apiKey = await getApiKey(selectedProvider)
    if (!apiKey) {
      throw new Error('No API key configured for selected provider')
    }

    const selectedModel = getSelectedModel(selectedProvider)
    
    const response = await fetch('/api/optimize-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content,
        options,
        provider: selectedProvider,
        model: selectedModel,
        apiKey 
      })
    })

    if (!response.ok) {
      throw new Error('Failed to optimize content')
    }

    const result = await response.json()
    return result.optimizedContent
  }, [selectedProvider, getApiKey])

  const setApiKey = useCallback(async (provider: AIProviderType, key: string) => {
    // Validate the key before storing
    const isValid = await validateApiKey(provider, key)
    if (isValid) {
      setStoreApiKey(provider, key)
      // Also store in the secure session manager
      await ApiKeyManager.getInstance().setApiKey(provider, key)
      
      // Force re-check configuration status
      const sessionKey = await ApiKeyManager.getInstance().getApiKey(provider)
      const keyExists = !!key || !!sessionKey
      setIsConfigured(keyExists)
    } else {
      throw new Error('Invalid API key')
    }
  }, [validateApiKey, setStoreApiKey])

  const removeApiKey = useCallback(async (provider: AIProviderType) => {
    removeStoreApiKey(provider)
    // Also remove from session manager
    ApiKeyManager.getInstance().removeApiKey(provider)
    
    // Force re-check configuration status for current provider
    if (provider === selectedProvider) {
      const sessionKey = await ApiKeyManager.getInstance().getApiKey(provider)
      const keyExists = !!sessionKey
      setIsConfigured(keyExists)
    }
  }, [removeStoreApiKey, selectedProvider])

  return {
    isConfigured,
    isValidating,
    validateApiKey,
    analyzeCategory,
    generateQuestions,
    generateArticle,
    optimizeContent,
    setApiKey,
    removeApiKey
  }
}