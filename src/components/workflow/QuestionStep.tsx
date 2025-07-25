'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, HelpCircle, Check, AlertCircle } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { promptTemplates } from '@/lib/prompt-templates'
import { Question, Response } from '@/types'
import { Button } from '../ui/Button'
import { cn } from '@/lib/utils'

interface FormData {
  [key: string]: string | string[]
}

export function QuestionStep() {
  const { 
    selectedCategory, 
    questions,
    responses,
    setQuestions,
    addResponse,
    setCurrentStep,
    setError,
    userInput
  } = useWorkflowStore()
  
  const [formData, setFormData] = useState<FormData>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const loadCategoryQuestions = useCallback(async () => {
    if (!selectedCategory) return

    setIsLoading(true)
    try {
      // Get category-specific questions from the prompt template system
      const categoryQuestions = promptTemplates.getQuestionTemplates(selectedCategory.primary)
      
      // Convert QuestionTemplate to Question format
      const formattedQuestions: Question[] = categoryQuestions.map(template => ({
        id: template.id,
        text: template.question,
        type: template.type === 'multiselect' ? 'multiselect' : template.type,
        required: template.required,
        options: template.options,
        placeholder: template.placeholder,
        category: selectedCategory.primary
      }))

      setQuestions(formattedQuestions)
    } catch (error) {
      console.error('Failed to load questions:', error)
      setError('Failed to load questions. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory, setQuestions, setError])

  // Load questions when component mounts or category changes
  useEffect(() => {
    if (selectedCategory && questions.length === 0) {
      loadCategoryQuestions()
    }
  }, [selectedCategory, questions.length, loadCategoryQuestions])

  // Pre-fill form with existing responses
  useEffect(() => {
    if (responses.length > 0) {
      const existingData: FormData = {}
      responses.forEach(response => {
        const question = questions.find(q => q.id === response.questionId)
        if (question?.type === 'multiselect') {
          try {
            existingData[response.questionId] = JSON.parse(response.answer)
          } catch {
            existingData[response.questionId] = [response.answer]
          }
        } else {
          existingData[response.questionId] = response.answer
        }
      })
      setFormData(existingData)
    }
  }, [responses, questions])

  const handleInputChange = (questionId: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: value
    }))
    
    // Clear error when user starts typing
    if (errors[questionId]) {
      setErrors(prev => ({
        ...prev,
        [questionId]: ''
      }))
    }
  }

  const validateCurrentQuestion = (): boolean => {
    const currentQuestion = questions[currentQuestionIndex]
    if (!currentQuestion) return true

    const value = formData[currentQuestion.id]
    const isEmpty = !value || (Array.isArray(value) && value.length === 0) || value.toString().trim() === ''

    if (currentQuestion.required && isEmpty) {
      setErrors(prev => ({
        ...prev,
        [currentQuestion.id]: 'This field is required'
      }))
      return false
    }

    return true
  }

  const handleNext = () => {
    if (!validateCurrentQuestion()) return

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmit = () => {
    // Validate all required questions
    const newErrors: Record<string, string> = {}
    let hasErrors = false

    questions.forEach(question => {
      const value = formData[question.id]
      const isEmpty = !value || (Array.isArray(value) && value.length === 0) || value.toString().trim() === ''

      if (question.required && isEmpty) {
        newErrors[question.id] = 'This field is required'
        hasErrors = true
      }
    })

    if (hasErrors) {
      setErrors(newErrors)
      // Go to first question with error
      const firstErrorIndex = questions.findIndex(q => newErrors[q.id])
      if (firstErrorIndex !== -1) {
        setCurrentQuestionIndex(firstErrorIndex)
      }
      return
    }

    // Save all responses
    questions.forEach(question => {
      const value = formData[question.id]
      if (value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) {
        const response: Response = {
          questionId: question.id,
          question: question.text,
          answer: Array.isArray(value) ? JSON.stringify(value) : value.toString(),
          timestamp: new Date()
        }
        addResponse(response)
      }
    })

    setCurrentStep('format-selection')
  }

  const handleBack = () => {
    setCurrentStep('category')
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center"
          >
            <HelpCircle className="w-8 h-8 text-white animate-pulse" />
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-gray-900 mb-2"
          >
            Loading Questions...
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-600"
          >
            Preparing category-specific questions for your {selectedCategory?.primary.toLowerCase()} article.
          </motion.p>
        </div>
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center"
          >
            <AlertCircle className="w-8 h-8 text-white" />
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold text-gray-900 mb-2"
          >
            No Questions Available
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-600 mb-6"
          >
            Unable to load questions for this category. Please go back and try again.
          </motion.p>

          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Category Selection
          </Button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center"
        >
          <HelpCircle className="w-8 h-8 text-white" />
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Answer Some Questions
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600"
        >
          Help me create better content by providing additional details about your {selectedCategory?.primary.toLowerCase()} article.
        </motion.p>
      </div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <div className="flex justify-between text-sm text-gray-500">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>

      {/* Question Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg p-6 border border-gray-200 space-y-4"
        >
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">
              {currentQuestion.text}
              {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            {currentQuestion.placeholder && (
              <p className="text-sm text-gray-500">{currentQuestion.placeholder}</p>
            )}
          </div>

          {/* Question Input */}
          <div className="space-y-3">
            {currentQuestion.type === 'text' && (
              <textarea
                value={(formData[currentQuestion.id] as string) || ''}
                onChange={(e) => handleInputChange(currentQuestion.id, e.target.value)}
                placeholder={currentQuestion.placeholder}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none",
                  errors[currentQuestion.id] ? "border-red-500" : "border-gray-300"
                )}
                rows={4}
              />
            )}

            {currentQuestion.type === 'select' && (
              <select
                value={(formData[currentQuestion.id] as string) || ''}
                onChange={(e) => handleInputChange(currentQuestion.id, e.target.value)}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent",
                  errors[currentQuestion.id] ? "border-red-500" : "border-gray-300"
                )}
              >
                <option value="">Select an option...</option>
                {currentQuestion.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {currentQuestion.type === 'multiselect' && (
              <div className="space-y-2">
                {currentQuestion.options?.map((option) => {
                  const currentValues = (formData[currentQuestion.id] as string[]) || []
                  const isChecked = currentValues.includes(option)
                  
                  return (
                    <label key={option} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const currentValues = (formData[currentQuestion.id] as string[]) || []
                          let newValues: string[]
                          
                          if (e.target.checked) {
                            newValues = [...currentValues, option]
                          } else {
                            newValues = currentValues.filter(v => v !== option)
                          }
                          
                          handleInputChange(currentQuestion.id, newValues)
                        }}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {errors[currentQuestion.id] && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors[currentQuestion.id]}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Question Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-between items-center"
      >
        <Button 
          variant="outline"
          onClick={currentQuestionIndex === 0 ? handleBack : handlePrevious}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentQuestionIndex === 0 ? 'Back' : 'Previous'}
        </Button>
        
        {isLastQuestion ? (
          <Button 
            onClick={handleSubmit}
            size="lg"
            className="min-w-[120px]"
          >
            Generate Article
            <Check className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleNext}
            size="lg"
            className="min-w-[120px]"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </motion.div>

      {/* Question Overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gray-50 rounded-lg p-4"
      >
        <div className="flex flex-wrap gap-2">
          {questions.map((_, index) => {
            const isCompleted = formData[questions[index].id] !== undefined && 
                              formData[questions[index].id] !== '' && 
                              !(Array.isArray(formData[questions[index].id]) && formData[questions[index].id].length === 0)
            const isCurrent = index === currentQuestionIndex
            const hasError = errors[questions[index].id]
            
            return (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={cn(
                  "w-8 h-8 rounded-full text-sm font-medium transition-all duration-200",
                  isCurrent
                    ? "bg-orange-500 text-white"
                    : hasError
                    ? "bg-red-500 text-white"
                    : isCompleted
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                )}
              >
                {index + 1}
              </button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}