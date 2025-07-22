'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Lightbulb, PenTool, Sparkles } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useAIProvider } from '@/hooks/useAIProvider'
import { ApiKeySetup } from '../ui/ApiKeySetup'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { cn } from '@/lib/utils'

const placeholderIdeas = [
  "How to build scalable microservices with Node.js and Docker",
  "The future of artificial intelligence in healthcare",
  "10 TypeScript tips that will improve your React development",
  "Understanding blockchain technology beyond cryptocurrency",
  "Machine learning algorithms every developer should know"
]

export function InputStep() {
  const { userInput, setUserInput, setCurrentStep, setError } = useWorkflowStore()
  const { isConfigured } = useAIProvider()
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0)
  const [localInput, setLocalInput] = useState(userInput)

  // Rotate placeholder text
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholderIdeas.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async () => {
    if (!localInput.trim()) {
      setError('Please enter your article idea')
      return
    }

    if (localInput.trim().length < 10) {
      setError('Please provide more details about your article idea')
      return
    }

    setUserInput(localInput.trim())
    setError(null)
    setCurrentStep('category')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit()
    }
  }

  if (!isConfigured) {
    return <ApiKeySetup />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center"
        >
          <Lightbulb className="w-8 h-8 text-white" />
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          What's your article idea?
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600"
        >
          Share your concept, topic, or rough outline. I'll help you structure it into a compelling Medium article.
        </motion.p>
      </div>

      {/* Main Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="relative">
          <Textarea
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholderIdeas[currentPlaceholder]}
            className="min-h-[150px] text-lg resize-none"
            autoFocus
          />
          
          {/* Character counter */}
          <div className="absolute bottom-3 right-3 text-xs text-gray-400">
            {localInput.length} characters
          </div>
        </div>

        {/* Quick suggestions */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700 flex items-center">
            <Sparkles className="w-4 h-4 mr-2" />
            Need inspiration? Try these Technology topics:
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {placeholderIdeas.slice(0, 4).map((idea, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                onClick={() => setLocalInput(idea)}
                className="p-3 text-left text-sm bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200"
              >
                <div className="flex items-start">
                  <PenTool className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{idea}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex justify-between items-center pt-6 border-t border-gray-100"
      >
        <div className="text-sm text-gray-500">
          <kbd className="px-2 py-1 text-xs bg-gray-100 rounded">Cmd</kbd> + 
          <kbd className="px-2 py-1 text-xs bg-gray-100 rounded ml-1">Enter</kbd> 
          <span className="ml-2">to continue</span>
        </div>
        
        <Button 
          onClick={handleSubmit}
          disabled={!localInput.trim() || localInput.trim().length < 10}
          size="lg"
          className="min-w-[120px]"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="bg-blue-50 rounded-lg p-4 border border-blue-200"
      >
        <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Tips for better results:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Be specific about your target audience</li>
          <li>• Mention the key points you want to cover</li>
          <li>• Include any personal experiences or examples</li>
          <li>• Specify your preferred article style (tutorial, opinion, etc.)</li>
        </ul>
      </motion.div>
    </div>
  )
}