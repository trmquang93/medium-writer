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
  const { selectedProvider, apiKeys, setApiKey: setStoreApiKey, removeApiKey: removeStoreApiKey } = useSettingsStore()
  const [isValidating, setIsValidating] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)

  // Check if the current provider is configured
  useEffect(() => {
    const keyExists = !!apiKeys[selectedProvider]
    setIsConfigured(keyExists)
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
    const apiKey = apiKeys[selectedProvider]
    if (!apiKey) {
      throw new Error('No API key configured for selected provider')
    }

    const response = await fetch('/api/analyze-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        input, 
        provider: selectedProvider,
        apiKey 
      })
    })

    if (!response.ok) {
      throw new Error('Failed to analyze category')
    }

    return response.json()
  }, [selectedProvider, apiKeys])

  const generateQuestions = useCallback(async (
    input: string, 
    category: ContentCategory
  ): Promise<Question[]> => {
    const apiKey = apiKeys[selectedProvider]
    if (!apiKey) {
      throw new Error('No API key configured for selected provider')
    }

    const response = await fetch('/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        input, 
        category,
        provider: selectedProvider,
        apiKey 
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate questions')
    }

    return response.json()
  }, [selectedProvider, apiKeys])

  const generateArticle = useCallback(async (
    input: string,
    category: ContentCategory,
    responses: { question: string; answer: string }[]
  ): Promise<Article> => {
    const apiKey = apiKeys[selectedProvider]
    if (!apiKey) {
      throw new Error('No API key configured for selected provider')
    }

    const response = await fetch('/api/generate-article', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        input, 
        category,
        responses,
        provider: selectedProvider,
        apiKey 
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate article')
    }

    return response.json()
  }, [selectedProvider, apiKeys])

  const optimizeContent = useCallback(async (
    content: string,
    options: OptimizationOptions
  ): Promise<string> => {
    const apiKey = apiKeys[selectedProvider]
    if (!apiKey) {
      throw new Error('No API key configured for selected provider')
    }

    const response = await fetch('/api/optimize-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content,
        options,
        provider: selectedProvider,
        apiKey 
      })
    })

    if (!response.ok) {
      throw new Error('Failed to optimize content')
    }

    const result = await response.json()
    return result.optimizedContent
  }, [selectedProvider, apiKeys])

  const setApiKey = useCallback(async (provider: AIProviderType, key: string) => {
    // Validate the key before storing
    const isValid = await validateApiKey(provider, key)
    if (isValid) {
      setStoreApiKey(provider, key)
      // Also store in the secure session manager
      ApiKeyManager.getInstance().setApiKey(provider, key)
    } else {
      throw new Error('Invalid API key')
    }
  }, [validateApiKey, setStoreApiKey])

  const removeApiKey = useCallback((provider: AIProviderType) => {
    removeStoreApiKey(provider)
    // Also remove from session manager
    ApiKeyManager.getInstance().removeApiKey(provider)
  }, [removeStoreApiKey])

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