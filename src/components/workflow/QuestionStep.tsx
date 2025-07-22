'use client'

import { motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { Button } from '../ui/Button'

export function QuestionStep() {
  const { setCurrentStep } = useWorkflowStore()

  const handleContinue = () => {
    setCurrentStep('generation')
  }

  const handleBack = () => {
    setCurrentStep('category')
  }

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
          Help me create better content by providing additional details about your article.
        </motion.p>
      </div>

      {/* Placeholder Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-orange-50 rounded-lg p-8 border border-orange-200 text-center"
      >
        <h3 className="text-lg font-medium text-orange-900 mb-2">Question Component Coming Soon</h3>
        <p className="text-orange-800">
          This will contain dynamic questions based on your selected category.
          For now, click Continue to proceed to the generation step.
        </p>
      </motion.div>

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
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <Button 
          onClick={handleContinue}
          size="lg"
          className="min-w-[120px]"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  )
}