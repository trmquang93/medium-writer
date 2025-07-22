'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Wand2, CheckCircle } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { Button } from '../ui/Button'

export function GenerationStep() {
  const { setCurrentStep } = useWorkflowStore()

  const handleEdit = () => {
    setCurrentStep('edit')
  }

  const handleBack = () => {
    setCurrentStep('questions')
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

      {/* Placeholder Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-green-50 rounded-lg p-8 border border-green-200 text-center"
      >
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-green-900 mb-2">Generation Component Coming Soon</h3>
        <p className="text-green-800">
          This will show the real-time article generation process with progress indicators.
          For now, click Edit to proceed to the final step.
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
          onClick={handleEdit}
          size="lg"
          className="min-w-[120px]"
        >
          Edit Article
        </Button>
      </motion.div>
    </div>
  )
}