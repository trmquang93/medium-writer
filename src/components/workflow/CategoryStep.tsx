'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Target, Brain, RefreshCw } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useAIProvider } from '@/hooks/useAIProvider'
import { ContentCategory, CategoryType } from '@/types'
import { Button } from '../ui/Button'
import { cn } from '@/lib/utils'

const categories = [
  {
    id: 'TECHNOLOGY' as CategoryType,
    name: 'Technology',
    description: 'AI, Programming, Data Science, Software Development',
    icon: '💻',
    color: 'bg-blue-500'
  },
  {
    id: 'PERSONAL_DEVELOPMENT' as CategoryType,
    name: 'Personal Development',
    description: 'Self-improvement, Mental Health, Productivity, Habits',
    icon: '🚀',
    color: 'bg-green-500'
  },
  {
    id: 'BUSINESS' as CategoryType,
    name: 'Business',
    description: 'Entrepreneurship, Finance, Startups, Management',
    icon: '💼',
    color: 'bg-purple-500'
  },
  {
    id: 'LIFESTYLE' as CategoryType,
    name: 'Lifestyle',
    description: 'Relationships, Health & Wellness, Travel, Food',
    icon: '🌟',
    color: 'bg-orange-500'
  },
  {
    id: 'CURRENT_AFFAIRS' as CategoryType,
    name: 'Current Affairs',
    description: 'Politics, Climate, Social Issues, News, Opinion',
    icon: '🌍',
    color: 'bg-red-500'
  }
]

export function CategoryStep() {
  const { 
    userInput, 
    selectedCategory, 
    setSelectedCategory, 
    setCurrentStep, 
    isLoading,
    setLoading,
    setError 
  } = useWorkflowStore()
  const { analyzeCategory } = useAIProvider()
  const [suggestedCategory, setSuggestedCategory] = useState<ContentCategory | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (userInput && !suggestedCategory) {
      handleAnalyzeCategory()
    }
  }, [userInput])

  const handleAnalyzeCategory = async () => {
    setIsAnalyzing(true)
    try {
      const category = await analyzeCategory(userInput)
      setSuggestedCategory(category)
      
      // Auto-select the suggested category if confidence is high
      if (category.confidence > 0.8) {
        setSelectedCategory(category)
      }
    } catch (error) {
      console.error('Category analysis failed:', error)
      setError('Failed to analyze category. Please select manually.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleCategorySelect = (categoryId: CategoryType) => {
    const category: ContentCategory = {
      primary: categoryId,
      confidence: 1.0,
      reasoning: 'User selected'
    }
    setSelectedCategory(category)
  }

  const handleContinue = () => {
    if (!selectedCategory) {
      setError('Please select a category')
      return
    }
    setError(null)
    setCurrentStep('questions')
  }

  const handleBack = () => {
    setCurrentStep('input')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center"
        >
          <Target className="w-8 h-8 text-white" />
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Choose Your Article Category
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600"
        >
          This helps me generate more targeted questions and create content that fits your goals.
        </motion.p>
      </div>

      {/* User Input Recap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
      >
        <h3 className="text-sm font-medium text-gray-700 mb-2">Your Article Idea:</h3>
        <p className="text-gray-900 text-sm leading-relaxed">{userInput}</p>
      </motion.div>

      {/* AI Analysis */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 rounded-lg p-4 border border-blue-200"
        >
          <div className="flex items-center">
            <Brain className="w-5 h-5 text-blue-600 mr-3 animate-pulse" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">AI is analyzing your content...</h4>
              <p className="text-sm text-blue-800">This will help suggest the best category</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Suggestion */}
      {suggestedCategory && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 rounded-lg p-4 border border-green-200"
        >
          <div className="flex items-start">
            <Brain className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-900 mb-1">AI Suggestion</h4>
              <p className="text-sm text-green-800 mb-2">
                <strong>{categories.find(c => c.id === suggestedCategory.primary)?.name}</strong> 
                <span className="ml-2">({Math.round(suggestedCategory.confidence * 100)}% confident)</span>
              </p>
              {suggestedCategory.reasoning && (
                <p className="text-xs text-green-700">{suggestedCategory.reasoning}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyzeCategory}
              disabled={isAnalyzing}
            >
              <RefreshCw className={cn("w-3 h-3", isAnalyzing && "animate-spin")} />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Category Selection */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <h3 className="text-sm font-medium text-gray-700">Select Category:</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((category, index) => {
            const isSelected = selectedCategory?.primary === category.id
            const isSuggested = suggestedCategory?.primary === category.id
            
            return (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                onClick={() => handleCategorySelect(category.id)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-200 text-left relative",
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : isSuggested
                    ? "border-green-400 bg-green-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                )}
              >
                {/* Suggested Badge */}
                {isSuggested && !isSelected && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Suggested
                  </div>
                )}
                
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{category.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 mb-1">{category.name}</h4>
                    <p className="text-sm text-gray-500 leading-tight">{category.description}</p>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex justify-between items-center pt-6 border-t border-gray-100"
      >
        <Button 
          variant="outline"
          onClick={handleBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <Button 
          onClick={handleContinue}
          disabled={!selectedCategory}
          size="lg"
          className="min-w-[120px]"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>

      {/* Selected Category Info */}
      {selectedCategory && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 rounded-lg p-4 border border-blue-200"
        >
          <div className="flex items-center">
            <div className="text-xl mr-3">
              {categories.find(c => c.id === selectedCategory.primary)?.icon}
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                Selected: {categories.find(c => c.id === selectedCategory.primary)?.name}
              </h4>
              <p className="text-sm text-blue-800">
                Ready to generate targeted questions for your {selectedCategory.primary.toLowerCase()} article
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}