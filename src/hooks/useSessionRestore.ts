'use client'

import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { useWorkflowStore } from '@/store/workflowStore'
import { ApiKeyManager } from '@/lib/api-key-manager'
import { AIProviderType } from '@/types'

interface SessionRestoreState {
  isRestoring: boolean
  isComplete: boolean
  hasRestoredData: boolean
  restoredProviders: AIProviderType[]
}

export const useSessionRestore = () => {
  const [restoreState, setRestoreState] = useState<SessionRestoreState>({
    isRestoring: true,
    isComplete: false,
    hasRestoredData: false,
    restoredProviders: []
  })

  const { restoreSession } = useSettingsStore()
  const { currentStep, generatedArticle } = useWorkflowStore()

  useEffect(() => {
    const restoreUserSession = async () => {
      try {
        setRestoreState(prev => ({ ...prev, isRestoring: true }))

        // Initialize API Key Manager and check for existing session data
        const apiKeyManager = ApiKeyManager.getInstance()
        const configuredProviders = apiKeyManager.getConfiguredProviders()
        
        // Restore API keys to the settings store
        if (configuredProviders.length > 0) {
          // Call the store's restore method
          restoreSession()
          
          setRestoreState(prev => ({
            ...prev,
            hasRestoredData: true,
            restoredProviders: configuredProviders
          }))
        }

        // Check if we have workflow data to restore
        const hasWorkflowData = currentStep !== 'input' || !!generatedArticle

        setRestoreState(prev => ({
          ...prev,
          isRestoring: false,
          isComplete: true,
          hasRestoredData: prev.hasRestoredData || hasWorkflowData
        }))

      } catch (error) {
        console.error('Failed to restore session:', error)
        setRestoreState(prev => ({
          ...prev,
          isRestoring: false,
          isComplete: true,
          hasRestoredData: false
        }))
      }
    }

    // Run session restore on mount
    restoreUserSession()
  }, [restoreSession, currentStep, generatedArticle])

  return {
    ...restoreState,
    hasConfiguredProviders: restoreState.restoredProviders.length > 0,
    hasWorkflowInProgress: currentStep !== 'input' || !!generatedArticle
  }
}

export default useSessionRestore