'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { useSessionRestore } from '@/hooks/useSessionRestore'

export function SessionStatus() {
  const { 
    isRestoring, 
    isComplete, 
    hasRestoredData, 
    hasConfiguredProviders,
    hasWorkflowInProgress,
    restoredProviders 
  } = useSessionRestore()

  // Don't show anything if there's no session data to restore
  if (isComplete && !hasRestoredData) {
    return null
  }

  // Don't show after restoration is complete and user has seen the status
  if (isComplete && hasRestoredData) {
    // Auto-hide after 3 seconds
    setTimeout(() => {
      // This component will unmount naturally
    }, 3000)
  }

  return (
    <AnimatePresence>
      {(isRestoring || (isComplete && hasRestoredData)) && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[300px]">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {isRestoring ? (
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {isRestoring ? 'Restoring Session...' : 'Session Restored'}
                </div>
                
                <div className="text-xs text-gray-600 mt-1">
                  {isRestoring ? (
                    'Loading your previous settings and data'
                  ) : (
                    <div className="space-y-1">
                      {hasConfiguredProviders && (
                        <div>✓ API keys restored ({restoredProviders.length} provider{restoredProviders.length !== 1 ? 's' : ''})</div>
                      )}
                      {hasWorkflowInProgress && (
                        <div>✓ Workflow progress restored</div>
                      )}
                      <div>✓ Settings and preferences restored</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}