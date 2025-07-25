'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkflowStore } from '@/store/workflowStore'
import { ContentFormat } from '@/types'
import { Button } from '@/components/ui/Button'
import { 
  BookOpen, 
  Users, 
  Copy,
  Check 
} from 'lucide-react'

interface FormatOption {
  format: ContentFormat
  title: string
  description: string
  icon: React.ComponentType<any>
  features: string[]
  length: string
  audience: string
}

const formatOptions: FormatOption[] = [
  {
    format: 'medium',
    title: 'Medium Article',
    description: 'Comprehensive long-form content for Medium publication',
    icon: BookOpen,
    features: ['In-depth coverage', 'SEO optimized', 'Multiple sections', 'Code examples'],
    length: '2,000-3,000 words',
    audience: 'Medium readers'
  },
  {
    format: 'linkedin',
    title: 'LinkedIn Post', 
    description: 'Professional networking content optimized for engagement',
    icon: Users,
    features: ['Professional tone', 'Hashtag optimization', 'Call-to-action', 'Mobile friendly'],
    length: '800-1,300 characters',
    audience: 'LinkedIn professionals'
  }
]

const combinedOption = {
  title: 'Both Formats',
  description: 'Generate content optimized for both platforms simultaneously',
  icon: Copy,
  features: ['Cross-platform reach', 'Platform-specific optimization', 'Consistent messaging', 'Maximum impact'],
  audience: 'Multi-platform strategy'
}

export function FormatSelectionStep() {
  const { setSelectedFormats, setCurrentStep } = useWorkflowStore()
  const [selectedFormats, setLocalSelectedFormats] = useState<ContentFormat[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  const handleFormatToggle = (format: ContentFormat) => {
    setLocalSelectedFormats(prev => {
      if (prev.includes(format)) {
        return prev.filter(f => f !== format)
      } else {
        return [...prev, format]
      }
    })
  }
  
  const handleBothFormats = () => {
    const bothSelected = selectedFormats.length === 2
    if (bothSelected) {
      setLocalSelectedFormats([])
    } else {
      setLocalSelectedFormats(['medium', 'linkedin'])
    }
  }
  
  const handleNext = async () => {
    if (selectedFormats.length === 0) return
    
    setIsProcessing(true)
    setSelectedFormats(selectedFormats)
    
    // Simulate brief processing time for smooth UX
    setTimeout(() => {
      setCurrentStep('generation')
      setIsProcessing(false)
    }, 300)
  }
  
  const handleBack = () => {
    setCurrentStep('questions')
  }
  
  const isBothSelected = selectedFormats.length === 2
  const canProceed = selectedFormats.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-900 mb-2"
        >
          Choose Your Content Format
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-gray-600"
        >
          Select the format(s) you'd like to generate from your idea
        </motion.p>
      </div>

      {/* Format Options */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {formatOptions.map((option, index) => {
          const isSelected = selectedFormats.includes(option.format)
          const Icon = option.icon
          
          return (
            <motion.div
              key={option.format}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative cursor-pointer transition-all duration-300 ${
                isSelected 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:shadow-lg hover:scale-105'
              }`}
              onClick={() => handleFormatToggle(option.format)}
            >
              <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
                {/* Selection Indicator */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-4 right-4 bg-blue-500 text-white rounded-full p-1"
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-lg mb-4 ${
                  isSelected 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {option.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {option.description}
                </p>
                
                {/* Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Length:</span>
                    <span className="font-medium text-gray-700">{option.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Audience:</span>
                    <span className="font-medium text-gray-700">{option.audience}</span>
                  </div>
                </div>
                
                {/* Features */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-2">Key Features:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {option.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Both Formats Option */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={`relative cursor-pointer transition-all duration-300 ${
          isBothSelected 
            ? 'ring-2 ring-purple-500 bg-purple-50' 
            : 'hover:shadow-lg hover:scale-105'
        }`}
        onClick={handleBothFormats}
      >
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Selection Indicator */}
          <AnimatePresence>
            {isBothSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-4 right-4 bg-purple-500 text-white rounded-full p-1"
              >
                <Check className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex items-start space-x-4">
            {/* Icon */}
            <div className={`inline-flex p-3 rounded-lg ${
              isBothSelected 
                ? 'bg-purple-100 text-purple-600' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              <Copy className="w-6 h-6" />
            </div>
            
            {/* Content */}
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {combinedOption.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {combinedOption.description}
              </p>
              
              {/* Features */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Benefits:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {combinedOption.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Perfect for:</p>
                  <p className="text-sm text-gray-600">{combinedOption.audience}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isProcessing}
        >
          Back to Questions
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={!canProceed || isProcessing}
          className="min-w-[140px]"
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing...</span>
            </div>
          ) : (
            `Generate Content (${selectedFormats.length} format${selectedFormats.length !== 1 ? 's' : ''})`
          )}
        </Button>
      </div>
      
      {/* Selection Summary */}
      <AnimatePresence>
        {selectedFormats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <p className="text-sm text-gray-600 mb-2">
              <strong>Selected format{selectedFormats.length > 1 ? 's' : ''}:</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedFormats.map(format => (
                <span 
                  key={format}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {format === 'medium' ? 'Medium Article' : 'LinkedIn Post'}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}