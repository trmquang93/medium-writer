'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Wand2, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Clock,
  Eye,
  Loader2,
  Sparkles,
  Brain,
  Target,
  Key
} from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useAIProvider } from '@/hooks/useAIProvider'
import { useSettingsStore } from '@/store/settingsStore'
import { Button } from '../ui/Button'
import { ApiKeyManager } from '../ui/ApiKeyManager'
import { cn } from '@/lib/utils'

interface GenerationProgress {
  stage: 'initializing' | 'analyzing' | 'structuring' | 'writing' | 'reviewing' | 'completed' | 'error'
  progress: number
  message: string
}

const generationStages: GenerationProgress[] = [
  { stage: 'initializing', progress: 10, message: 'Initializing AI writer...' },
  { stage: 'analyzing', progress: 25, message: 'Analyzing your inputs and category...' },
  { stage: 'structuring', progress: 40, message: 'Creating article structure...' },
  { stage: 'writing', progress: 70, message: 'Writing your article...' },
  { stage: 'reviewing', progress: 90, message: 'Reviewing and polishing...' },
  { stage: 'completed', progress: 100, message: 'Article generation completed!' }
]

export function GenerationStep() {
  const { 
    userInput, 
    selectedCategory, 
    responses, 
    generatedArticle, 
    setGeneratedArticle,
    setCurrentStep,
    setError,
    error 
  } = useWorkflowStore()
  
  const { generateArticle, isConfigured } = useAIProvider()
  const { selectedProvider } = useSettingsStore()
  
  const [currentStage, setCurrentStage] = useState<GenerationProgress>(() => 
    generatedArticle ? generationStages[generationStages.length - 1] : generationStages[0]
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showApiKeyManager, setShowApiKeyManager] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout>()

  // Timer effect for elapsed time
  useEffect(() => {
    if (isGenerating && startTime) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000))
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isGenerating, startTime])

  // Effect to wait for initial configuration check before taking any action
  useEffect(() => {
    // If we already have an article, skip the delay
    if (generatedArticle) {
      setIsInitializing(false)
      return
    }
    
    // Add a small delay to allow async configuration check to complete
    const timer = setTimeout(() => {
      setIsInitializing(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [generatedArticle])

  // Effect to set completed state when navigating back with existing article
  useEffect(() => {
    if (generatedArticle && currentStage.stage !== 'completed') {
      setCurrentStage({
        stage: 'completed',
        progress: 100,
        message: 'Article generation completed!'
      })
    }
  }, [generatedArticle, currentStage.stage])

  // Separate effect for clearing error when article exists
  useEffect(() => {
    if (generatedArticle && error) {
      setError(null)
    }
  }, [generatedArticle, error])

  // Auto-start generation when component is ready and configured
  const hasAttemptedGeneration = useRef(false)
  
  useEffect(() => {
    // Don't act until we've finished initializing to avoid race conditions
    if (isInitializing) return
    
    // Only attempt generation once per component mount
    if (generatedArticle || hasAttemptedGeneration.current) return

    if (!isGenerating && !error && isConfigured) {
      hasAttemptedGeneration.current = true
      handleGenerate()
    } else if (!isConfigured && !error) {
      setError('No API key configured. Please set up your AI provider first.')
      setCurrentStage({
        stage: 'error',
        progress: 0,
        message: 'API key required. Please configure your API provider.'
      })
    }
  }, [isConfigured, isInitializing, generatedArticle, isGenerating, error])
  
  // Reset attempt flag when user manually retries
  useEffect(() => {
    if (!generatedArticle && !isGenerating && !error) {
      hasAttemptedGeneration.current = false
    }
  }, [generatedArticle, isGenerating, error])

  const simulateProgressStages = async (abortSignal?: AbortSignal): Promise<void> => {
    for (const stage of generationStages.slice(0, -1)) {
      if (abortSignal?.aborted) {
        throw new Error('Progress simulation aborted')
      }
      setCurrentStage(stage)
      // Randomize timing to make it feel more natural
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000))
    }
  }

  const handleGenerate = async (isRetry: boolean = false) => {
    if (!userInput || !selectedCategory) {
      setError('Missing required information for article generation')
      return
    }

    if (!isConfigured) {
      setError('No API key configured. Please set up your AI provider first.')
      setCurrentStage({
        stage: 'error',
        progress: 0,
        message: 'API key required. Please configure your AI provider.'
      })
      return
    }

    // Prevent multiple concurrent generations
    if (isGenerating) {
      console.warn('Generation already in progress, ignoring duplicate request')
      return
    }

    console.log('Starting article generation:', {
      provider: selectedProvider,
      category: selectedCategory.primary,
      userInput: userInput.substring(0, 100) + '...',
      responseCount: responses.length,
      isRetry,
      retryCount
    })

    setIsGenerating(true)
    setStartTime(new Date())
    setError(null)
    
    if (isRetry) {
      setRetryCount(prev => prev + 1)
    }

    // Create abort controller for cleanup
    const abortController = new AbortController()

    try {
      // Prepare responses data for the API
      const responseData = responses.map(r => ({
        question: r.question,
        answer: r.answer
      }))

      console.log('Starting progress simulation and API call...')

      // Start progress simulation (don't wait for it)
      simulateProgressStages(abortController.signal).catch((err) => {
        console.log('Progress simulation ended:', err.message)
      })

      // Generate article with timeout handling
      console.log('Calling generateArticle API...')
      const startTime = Date.now()
      const article = await generateArticle(userInput, selectedCategory, responseData)
      const duration = Date.now() - startTime
      
      console.log('Article generation completed:', {
        duration: `${duration}ms`,
        title: article.title,
        wordCount: article.wordCount,
        provider: selectedProvider
      })
      
      // Article generated successfully
      setGeneratedArticle(article)
      setCurrentStage(generationStages[generationStages.length - 1])
      
      // Abort any ongoing progress simulation
      abortController.abort()

    } catch (error) {
      console.error('Article generation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        provider: selectedProvider,
        duration: startTime ? Date.now() - startTime.getTime() : 'unknown'
      })
      
      // Abort progress simulation
      abortController.abort()
      
      let errorMessage = 'Generation failed. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('AbortError')) {
          errorMessage = 'Request timed out. Please check your internet connection and try again.'
        } else if (error.message.includes('API key')) {
          errorMessage = 'API key issue. Please check your AI provider configuration.'
        } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.'
        } else {
          errorMessage = error.message
        }
      }
      
      setCurrentStage({
        stage: 'error',
        progress: 0,
        message: errorMessage
      })
      setError(errorMessage)
    } finally {
      setIsGenerating(false)
      console.log('Generation process completed, isGenerating set to false')
    }
  }

  const handleEdit = () => {
    setCurrentStep('edit')
  }

  const handleBack = () => {
    setCurrentStep('questions')
  }

  const handleRetry = () => {
    handleGenerate(true)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
  }

  const getStageIcon = (stage: GenerationProgress['stage']) => {
    switch (stage) {
      case 'initializing': return <Loader2 className="w-5 h-5 animate-spin" />
      case 'analyzing': return <Brain className="w-5 h-5" />
      case 'structuring': return <Target className="w-5 h-5" />
      case 'writing': return <FileText className="w-5 h-5" />
      case 'reviewing': return <Eye className="w-5 h-5" />
      case 'completed': return <CheckCircle className="w-5 h-5" />
      case 'error': return <AlertTriangle className="w-5 h-5" />
      default: return <Sparkles className="w-5 h-5" />
    }
  }

  const getStageColor = (stage: GenerationProgress['stage']) => {
    switch (stage) {
      case 'initializing': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'analyzing': return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'structuring': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'writing': return 'text-green-600 bg-green-50 border-green-200'
      case 'reviewing': return 'text-indigo-600 bg-indigo-50 border-indigo-200'
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'error': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
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
          className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center"
        >
          <Wand2 className="w-8 h-8 text-white" />
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Generate Your Article
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600"
        >
          AI is creating your personalized Medium article based on your inputs.
        </motion.p>
      </div>

      {/* Generation Status */}
      <AnimatePresence mode="wait">
        {isGenerating || generatedArticle || error || isInitializing ? (
          <motion.div
            key="generation-status"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Progress Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "p-2 rounded-lg border transition-all duration-500",
                  getStageColor(currentStage.stage)
                )}>
                  {getStageIcon(currentStage.stage)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {currentStage.stage === 'error' ? 'Generation Failed' : 
                     currentStage.stage === 'completed' ? 'Article Ready!' : 
                     'Generating Article...'}
                  </h3>
                  <p className="text-sm text-gray-600">{currentStage.message}</p>
                </div>
              </div>
              
              {(isGenerating || elapsedTime > 0) && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(elapsedTime)}</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {(isGenerating || currentStage.stage === 'completed') && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium text-gray-900">{currentStage.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    className={cn(
                      "h-3 rounded-full transition-all duration-500",
                      currentStage.stage === 'completed' 
                        ? "bg-gradient-to-r from-green-500 to-emerald-600" 
                        : "bg-gradient-to-r from-blue-500 to-purple-600"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${currentStage.progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}

            {/* Error State */}
            {currentStage.stage === 'error' && (
              <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-red-900 font-medium mb-2">Generation Failed</h4>
                    <p className="text-red-800 text-sm mb-4">{error || currentStage.message}</p>
                    
                    <div className="flex space-x-2">
                      {/* Show API key setup button if not configured */}
                      {!isConfigured && (
                        <Button
                          onClick={() => setShowApiKeyManager(true)}
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Configure API Key
                        </Button>
                      )}
                      
                      {/* Show retry button if configured and retry count < 3 */}
                      {isConfigured && retryCount < 3 && (
                        <Button
                          onClick={handleRetry}
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Try Again {retryCount > 0 && `(${retryCount + 1}/3)`}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success State */}
            {currentStage.stage === 'completed' && generatedArticle && (
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-green-900 font-medium mb-2">Article Generated Successfully!</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-green-800 mb-4">
                      <div>
                        <span className="font-medium">Title:</span>
                        <p className="truncate">{generatedArticle.title}</p>
                      </div>
                      <div>
                        <span className="font-medium">Words:</span>
                        <p>{generatedArticle.wordCount?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium">Reading Time:</span>
                        <p>{generatedArticle.readingTime || 'N/A'} min</p>
                      </div>
                      <div>
                        <span className="font-medium">Provider:</span>
                        <p className="capitalize">{selectedProvider}</p>
                      </div>
                    </div>
                    
                    {/* Article Preview */}
                    <div className="bg-white rounded-lg p-4 border border-green-300 max-h-48 overflow-y-auto">
                      <h5 className="font-medium text-gray-900 mb-2">Preview:</h5>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        {generatedArticle.content.substring(0, 300)}
                        {generatedArticle.content.length > 300 && '...'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Generation Info */}
            {isGenerating && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-2 text-sm text-blue-800">
                  <Sparkles className="w-4 h-4" />
                  <span>Using {selectedProvider.toUpperCase()} to generate your {selectedCategory?.primary.toLowerCase().replace('_', ' ')} article</span>
                </div>
              </div>
            )}

            {/* Initialization State */}
            {isInitializing && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-2 text-sm text-blue-800">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking API key configuration...</span>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          // Initial loading state
          <motion.div
            key="initial-loading"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-8 border border-blue-200 text-center"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Preparing Generation</h3>
            <p className="text-gray-600">Setting up your personalized article generation...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-between items-center pt-6 border-t border-gray-100"
      >
        <Button 
          variant="outline"
          onClick={handleBack}
          disabled={isGenerating}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="flex space-x-3">
          {currentStage.stage === 'error' && retryCount >= 3 && (
            <Button
              onClick={handleBack}
              variant="outline"
            >
              Modify Questions
            </Button>
          )}
          
          {generatedArticle && currentStage.stage === 'completed' && (
            <Button 
              onClick={handleEdit}
              size="lg"
              className="min-w-[120px]"
            >
              Edit Article
            </Button>
          )}
          
          {!generatedArticle && !isGenerating && !isInitializing && currentStage.stage !== 'error' && isConfigured && (
            <Button 
              onClick={() => handleGenerate()}
              size="lg"
              className="min-w-[120px]"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate
            </Button>
          )}
          
          {!generatedArticle && !isGenerating && !isInitializing && currentStage.stage !== 'error' && !isConfigured && (
            <Button 
              onClick={() => setShowApiKeyManager(true)}
              size="lg"
              className="min-w-[120px]"
            >
              <Key className="w-4 h-4 mr-2" />
              Configure API Key
            </Button>
          )}

          {isInitializing && (
            <Button 
              disabled
              size="lg"
              className="min-w-[120px]"
            >
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </Button>
          )}
        </div>
      </motion.div>
      
      {/* API Key Manager Modal */}
      <ApiKeyManager 
        isOpen={showApiKeyManager} 
        onClose={() => setShowApiKeyManager(false)} 
      />
    </div>
  )
}