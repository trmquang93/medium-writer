'use client'

import { useState } from 'react'
import { useAIProvider } from '@/hooks/useAIProvider'
import { useSettingsStore } from '@/store/settingsStore'
import { Button } from './ui/Button'
import { ApiKeyManager } from './ui/ApiKeyManager'

export function TestConnection() {
  const { isConfigured, analyzeCategory } = useAIProvider()
  const { selectedProvider } = useSettingsStore()
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)

  const testConnection = async () => {
    if (!isConfigured) {
      setResult('❌ No API key configured')
      return
    }

    setTesting(true)
    try {
      const category = await analyzeCategory('How to build a React app with TypeScript and modern tools')
      setResult(`✅ Connection successful! 
Category: ${category.primary}
Confidence: ${Math.round(category.confidence * 100)}%
Reasoning: ${category.reasoning}`)
    } catch (error) {
      setResult(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-sm">
        <h3 className="font-medium mb-2">API Connection</h3>
        <div className="space-y-2">
          <div className="text-sm">
            Provider: <span className="font-medium">{selectedProvider?.toUpperCase() || 'None'}</span>
          </div>
          <div className="text-sm">
            Status: {isConfigured ? '✅ Configured' : '❌ Not configured'}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={() => setShowSettings(true)}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              Settings
            </Button>
            
            <Button 
              onClick={testConnection}
              loading={testing}
              disabled={!isConfigured || testing}
              size="sm"
              className="flex-1"
            >
              Test
            </Button>
          </div>
          
          {result && (
            <div className="text-xs bg-gray-50 p-2 rounded border whitespace-pre-line">
              {result}
            </div>
          )}
        </div>
      </div>

      <ApiKeyManager 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </>
  )
}