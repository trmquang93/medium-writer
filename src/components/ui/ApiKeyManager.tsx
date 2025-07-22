'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Key, Eye, EyeOff, Trash2, Plus, CheckCircle, AlertCircle } from 'lucide-react'
import { AIProviderType } from '@/types'
import { useSettingsStore } from '@/store/settingsStore'
import { useAIProvider } from '@/hooks/useAIProvider'
import { Button } from './Button'
import { Input } from './Input'
import { cn } from '@/lib/utils'

const aiProviders = [
  { id: 'openai' as AIProviderType, name: 'OpenAI', color: 'bg-green-500' },
  { id: 'gemini' as AIProviderType, name: 'Google Gemini', color: 'bg-blue-500' },
  { id: 'anthropic' as AIProviderType, name: 'Anthropic Claude', color: 'bg-orange-500' },
  { id: 'openrouter' as AIProviderType, name: 'OpenRouter', color: 'bg-purple-500' }
]

interface ApiKeyManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function ApiKeyManager({ isOpen, onClose }: ApiKeyManagerProps) {
  const { apiKeys, selectedProvider, setSelectedProvider } = useSettingsStore()
  const { setApiKey, removeApiKey, validateApiKey, isValidating } = useAIProvider()
  const [showKeys, setShowKeys] = useState<Record<AIProviderType, boolean>>({} as any)
  const [editingProvider, setEditingProvider] = useState<AIProviderType | null>(null)
  const [newKey, setNewKey] = useState('')
  const [validationState, setValidationState] = useState<Record<string, 'idle' | 'success' | 'error'>>({})

  const toggleKeyVisibility = (provider: AIProviderType) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }))
  }

  const handleAddKey = async (provider: AIProviderType) => {
    if (!newKey.trim()) return

    try {
      setValidationState(prev => ({ ...prev, [provider]: 'idle' }))
      
      const isValid = await validateApiKey(provider, newKey.trim())
      
      if (isValid) {
        await setApiKey(provider, newKey.trim())
        setValidationState(prev => ({ ...prev, [provider]: 'success' }))
        setEditingProvider(null)
        setNewKey('')
      } else {
        setValidationState(prev => ({ ...prev, [provider]: 'error' }))
      }
    } catch (error) {
      setValidationState(prev => ({ ...prev, [provider]: 'error' }))
    }
  }

  const handleRemoveKey = (provider: AIProviderType) => {
    removeApiKey(provider)
    setValidationState(prev => ({ ...prev, [provider]: 'idle' }))
    
    // If we removed the currently selected provider, switch to another one
    if (provider === selectedProvider) {
      const remainingProviders = aiProviders
        .map(p => p.id)
        .filter(p => p !== provider && apiKeys[p])
      
      if (remainingProviders.length > 0) {
        setSelectedProvider(remainingProviders[0])
      } else {
        setSelectedProvider('openai') // Default fallback
      }
    }
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '***'
    return key.substring(0, 4) + '***' + key.substring(key.length - 4)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Settings className="w-5 h-5 text-blue-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900">API Key Management</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[calc(90vh-120px)] overflow-y-auto">
                <div className="space-y-4">
                  {/* Current Provider */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">Current Provider</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={cn("w-3 h-3 rounded-full mr-3", 
                          aiProviders.find(p => p.id === selectedProvider)?.color || 'bg-gray-400'
                        )} />
                        <span className="text-blue-800 font-medium">
                          {aiProviders.find(p => p.id === selectedProvider)?.name || 'None'}
                        </span>
                      </div>
                      {apiKeys[selectedProvider] && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </div>

                  {/* API Keys List */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">Configured API Keys</h3>
                    
                    {aiProviders.map((provider) => {
                      const hasKey = !!apiKeys[provider.id]
                      const isEditing = editingProvider === provider.id
                      const validation = validationState[provider.id] || 'idle'

                      return (
                        <div key={provider.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <div className={cn("w-3 h-3 rounded-full mr-3", provider.color)} />
                              <span className="font-medium">{provider.name}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {hasKey && !isEditing && (
                                <>
                                  <button
                                    onClick={() => setSelectedProvider(provider.id)}
                                    disabled={selectedProvider === provider.id}
                                    className={cn(
                                      "text-xs px-2 py-1 rounded",
                                      selectedProvider === provider.id
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    )}
                                  >
                                    {selectedProvider === provider.id ? 'Active' : 'Set Active'}
                                  </button>
                                  <button
                                    onClick={() => toggleKeyVisibility(provider.id)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    {showKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                  <button
                                    onClick={() => handleRemoveKey(provider.id)}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              
                              {!hasKey && !isEditing && (
                                <button
                                  onClick={() => setEditingProvider(provider.id)}
                                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add Key
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Key Display */}
                          {hasKey && !isEditing && (
                            <div className="mt-2">
                              <div className="bg-gray-50 rounded px-3 py-2 font-mono text-sm text-gray-700">
                                {showKeys[provider.id] ? apiKeys[provider.id] : maskApiKey(apiKeys[provider.id])}
                              </div>
                            </div>
                          )}

                          {/* Key Input */}
                          {isEditing && (
                            <div className="mt-2 space-y-2">
                              <Input
                                type="password"
                                value={newKey}
                                onChange={(e) => setNewKey(e.target.value)}
                                placeholder={`Enter ${provider.name} API key...`}
                                className="font-mono text-sm"
                              />
                              
                              {validation === 'error' && (
                                <div className="flex items-center text-red-600 text-sm">
                                  <AlertCircle className="w-4 h-4 mr-1" />
                                  Invalid API key
                                </div>
                              )}
                              
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => handleAddKey(provider.id)}
                                  loading={isValidating}
                                  disabled={!newKey.trim()}
                                  size="sm"
                                >
                                  Validate & Save
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingProvider(null)
                                    setNewKey('')
                                    setValidationState(prev => ({ ...prev, [provider.id]: 'idle' }))
                                  }}
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* BYOK Benefits */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200 mt-6">
                    <div className="flex items-start">
                      <Key className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-green-900 mb-1">BYOK Benefits</h4>
                        <ul className="text-xs text-green-700 space-y-1">
                          <li>• Complete privacy - your data never touches our servers</li>
                          <li>• Direct billing to your AI provider account</li>
                          <li>• Keys stored only in browser session (cleared when closed)</li>
                          <li>• Full transparency in AI usage and costs</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}