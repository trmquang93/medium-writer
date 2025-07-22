'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Key, Shield, ExternalLink, Check, AlertCircle } from 'lucide-react'
import { AIProviderType } from '@/types'
import { useSettingsStore } from '@/store/settingsStore'
import { useAIProvider } from '@/hooks/useAIProvider'
import { Button } from './Button'
import { Input } from './Input'
import { cn } from '@/lib/utils'

const aiProviders = [
  {
    id: 'openai' as AIProviderType,
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5 Turbo',
    color: 'bg-green-500',
    setupUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-...'
  },
  {
    id: 'gemini' as AIProviderType,
    name: 'Google Gemini',
    description: 'Gemini Pro, Gemini Flash',
    color: 'bg-blue-500',
    setupUrl: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIza...'
  },
  {
    id: 'anthropic' as AIProviderType,
    name: 'Anthropic Claude',
    description: 'Claude 3 Haiku, Sonnet, Opus',
    color: 'bg-orange-500',
    setupUrl: 'https://console.anthropic.com/account/keys',
    placeholder: 'sk-ant-...'
  },
  {
    id: 'openrouter' as AIProviderType,
    name: 'OpenRouter',
    description: 'Access to 100+ models',
    color: 'bg-purple-500',
    setupUrl: 'https://openrouter.ai/keys',
    placeholder: 'sk-or-...'
  }
]

export function ApiKeySetup() {
  const { selectedProvider, setSelectedProvider } = useSettingsStore()
  const { setApiKey, isValidating, validateApiKey } = useAIProvider()
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [validationState, setValidationState] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Set OpenAI as default provider on mount
  useEffect(() => {
    if (!selectedProvider) {
      setSelectedProvider('openai')
    }
  }, [])

  const selectedProviderInfo = aiProviders.find(p => p.id === selectedProvider)!

  const handleValidateAndSave = async () => {
    if (!apiKeyInput.trim()) {
      setValidationState('error')
      setErrorMessage('Please enter an API key')
      return
    }

    try {
      setValidationState('idle')
      setErrorMessage('')
      
      const isValid = await validateApiKey(selectedProvider, apiKeyInput.trim())
      
      if (isValid) {
        await setApiKey(selectedProvider, apiKeyInput.trim())
        setValidationState('success')
        // The workflow will automatically advance since isConfigured will become true
      } else {
        setValidationState('error')
        setErrorMessage('Invalid API key. Please check your key and try again.')
      }
    } catch (error) {
      setValidationState('error')
      setErrorMessage('Failed to validate API key. Please try again.')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center"
        >
          <Key className="w-8 h-8 text-white" />
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Bring Your Own API Key (BYOK)
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600"
        >
          Connect your preferred AI provider with your own API key. You maintain full control, privacy, 
          and direct billing - we never see or store your keys permanently.
        </motion.p>
      </div>

      {/* Provider Selection */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <h3 className="text-sm font-medium text-gray-700 mb-3">Select AI Provider</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {aiProviders.map((provider, index) => (
            <motion.button
              key={provider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              onClick={() => setSelectedProvider(provider.id)}
              className={cn(
                "p-4 rounded-xl border-2 transition-all duration-200 text-left",
                selectedProvider === provider.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              )}
            >
              <div className="flex items-center space-x-3">
                <div className={cn("w-3 h-3 rounded-full", provider.color)} />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{provider.name}</h4>
                  <p className="text-sm text-gray-500">{provider.description}</p>
                </div>
                {selectedProvider === provider.id && (
                  <Check className="w-5 h-5 text-blue-500" />
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* API Key Input */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Enter {selectedProviderInfo.name} API Key
          </h3>
          <a
            href={selectedProviderInfo.setupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            Get API Key
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>

        <div className="relative">
          <Input
            type={showApiKey ? 'text' : 'password'}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder={selectedProviderInfo.placeholder}
            className={cn(
              "pr-10",
              validationState === 'success' && "border-green-500",
              validationState === 'error' && "border-red-500"
            )}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Validation State */}
        {validationState === 'success' && (
          <div className="flex items-center text-sm text-green-600">
            <Check className="w-4 h-4 mr-2" />
            API key validated successfully!
          </div>
        )}

        {validationState === 'error' && errorMessage && (
          <div className="flex items-center text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            {errorMessage}
          </div>
        )}
      </motion.div>

      {/* Action Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex justify-center pt-6 border-t border-gray-100"
      >
        <Button
          onClick={handleValidateAndSave}
          disabled={!apiKeyInput.trim() || isValidating}
          loading={isValidating}
          size="lg"
          className="min-w-[160px]"
        >
          {isValidating ? 'Validating...' : 'Validate & Continue'}
        </Button>
      </motion.div>

      {/* BYOK Benefits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="bg-green-50 rounded-lg p-4 border border-green-200"
      >
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-green-900 mb-1">Bring Your Own Key (BYOK)</h4>
            <p className="text-sm text-green-800 mb-2">
              You maintain complete control and ownership of your AI usage:
            </p>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• <strong>Privacy</strong>: Your data never touches our servers</li>
              <li>• <strong>Control</strong>: Direct billing to your AI provider account</li>
              <li>• <strong>Security</strong>: Keys stored only in your browser session</li>
              <li>• <strong>Transparency</strong>: See exactly what you're being charged</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Getting Started Guide */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="bg-blue-50 rounded-lg p-4 border border-blue-200"
      >
        <h4 className="text-sm font-medium text-blue-900 mb-2">🚀 Quick Start Guide</h4>
        <div className="text-sm text-blue-800 space-y-2">
          <div>
            <strong>1. Get your API key:</strong> Visit{' '}
            <a
              href={selectedProviderInfo.setupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-900"
            >
              {selectedProviderInfo.name} API Keys
            </a>
          </div>
          <div>
            <strong>2. Create a new key</strong> with appropriate permissions
          </div>
          <div>
            <strong>3. Paste it above</strong> and click "Validate & Continue"
          </div>
          <div>
            <strong>4. Start creating</strong> amazing content!
          </div>
        </div>
      </motion.div>
    </div>
  )
}