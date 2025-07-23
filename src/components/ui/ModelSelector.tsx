'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check, Sparkles, Cpu, Clock, DollarSign, Search, X } from 'lucide-react'
import { AIProviderType, ModelInfo } from '@/types'
import { useSettingsStore } from '@/store/settingsStore'
import { cn } from '@/lib/utils'
import { OpenAIProvider } from '@/lib/ai-providers/openai-provider'
import { GeminiProvider } from '@/lib/ai-providers/gemini-provider'
import { ClaudeProvider } from '@/lib/ai-providers/claude-provider'
import { OpenRouterProvider } from '@/lib/ai-providers/openrouter-provider'

interface ModelSelectorProps {
  provider: AIProviderType
  disabled?: boolean
  className?: string
}

const getProviderModels = (provider: AIProviderType): ModelInfo[] => {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider('dummy').getAvailableModels()
    case 'gemini':
      return new GeminiProvider('dummy').getAvailableModels()
    case 'anthropic':
      return new ClaudeProvider('dummy').getAvailableModels()
    case 'openrouter':
      return new OpenRouterProvider('dummy').getAvailableModels()
    default:
      return []
  }
}

const getCapabilityIcon = (capability: string) => {
  switch (capability) {
    case 'fast-response':
      return <Clock className="w-3 h-3" />
    case 'complex-reasoning':
    case 'reasoning':
      return <Cpu className="w-3 h-3" />
    case 'long-context':
      return <Sparkles className="w-3 h-3" />
    default:
      return null
  }
}

const formatCost = (cost?: number) => {
  if (!cost) return 'N/A'
  if (cost < 0.001) return `$${(cost * 1000).toFixed(4)}/1k`
  return `$${cost.toFixed(3)}/1k`
}

export function ModelSelector({ provider, disabled = false, className = '' }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredModels, setFilteredModels] = useState<ModelInfo[]>([])
  const { selectedModels, getSelectedModel, setSelectedModel } = useSettingsStore()
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  const currentModel = getSelectedModel(provider) || availableModels.find(m => m.isDefault)?.id || availableModels[0]?.id
  const selectedModelInfo = availableModels.find(m => m.id === currentModel)

  // Load models on component mount and when provider changes
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true)
      try {
        const models = getProviderModels(provider)
        setAvailableModels(models)
        
        // For OpenRouter, try to refresh the cache in the background
        if (provider === 'openrouter') {
          // Trigger cache refresh (will update models on next render)
          setTimeout(() => {
            const refreshedModels = getProviderModels(provider)
            if (refreshedModels.length !== models.length) {
              setAvailableModels(refreshedModels)
            }
          }, 1000)
        }
      } finally {
        setIsLoadingModels(false)
      }
    }

    loadModels()
  }, [provider])

  // Filter models based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredModels(availableModels)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = availableModels.filter(model => 
        model.name.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query) ||
        model.description.toLowerCase().includes(query) ||
        model.capabilities.some(cap => cap.toLowerCase().includes(query))
      )
      setFilteredModels(filtered)
    }
  }, [availableModels, searchQuery])

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(provider, modelId)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleDropdownOpen = () => {
    if (!disabled) {
      setIsOpen(true)
      // Focus search input after dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }

  const handleSearchClear = () => {
    setSearchQuery('')
    searchInputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchQuery('')
    }
  }

  if (availableModels.length === 0) {
    return null
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selected Model Display */}
      <button
        onClick={handleDropdownOpen}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5",
          "bg-gray-50 border border-gray-200 rounded-lg",
          "hover:bg-gray-100 hover:border-gray-300 transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        )}
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="flex-shrink-0">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="text-sm font-medium text-gray-900 truncate">
              {isLoadingModels ? 'Loading models...' : selectedModelInfo?.name || 'Select Model'}
            </div>
            {selectedModelInfo && !isLoadingModels && (
              <div className="text-xs text-gray-600 truncate">
                {selectedModelInfo.description}
              </div>
            )}
            {isLoadingModels && (
              <div className="text-xs text-gray-500 truncate">
                Fetching available models...
              </div>
            )}
          </div>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchQuery ? `${filteredModels.length} of ${availableModels.length} models` : `Search ${availableModels.length} models...`}
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={handleSearchClear}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Models List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredModels.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchQuery ? `No models found for "${searchQuery}"` : 'No models available'}
                </div>
              ) : (
                filteredModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150",
                      "border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50",
                      model.id === currentModel && "bg-blue-50 border-blue-200"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {model.name}
                          </span>
                          {model.isDefault && (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                              Default
                            </span>
                          )}
                          {model.id === currentModel && (
                            <Check className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {model.description}
                        </p>
                        
                        {/* Model Stats */}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Cpu className="w-3 h-3" />
                            <span>{model.maxTokens.toLocaleString()} tokens</span>
                          </div>
                          {model.inputCostPer1000 && (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-3 h-3" />
                              <span>
                                {formatCost(model.inputCostPer1000)} in / {formatCost(model.outputCostPer1000)} out
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Capabilities */}
                        {model.capabilities.length > 0 && (
                          <div className="flex items-center space-x-2 mt-2">
                            {model.capabilities.slice(0, 3).map((capability) => (
                              <div 
                                key={capability}
                                className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                              >
                                {getCapabilityIcon(capability)}
                                <span className="capitalize">{capability.replace('-', ' ')}</span>
                              </div>
                            ))}
                            {model.capabilities.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{model.capabilities.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}