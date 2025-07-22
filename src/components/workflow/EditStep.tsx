'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Edit3, Download, Home } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { Button } from '../ui/Button'

export function EditStep() {
  const { resetWorkflow, setCurrentStep } = useWorkflowStore()

  const handleStartOver = () => {
    resetWorkflow()
  }

  const handleBack = () => {
    setCurrentStep('generation')
  }

  const handleGoHome = () => {
    window.location.href = '/'
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
          <Edit3 className="w-8 h-8 text-white" />
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Edit & Export
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600"
        >
          Fine-tune your article and export it in your preferred format.
        </motion.p>
      </div>

      {/* Placeholder Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-purple-50 rounded-lg p-8 border border-purple-200 text-center"
      >
        <Download className="w-12 h-12 text-purple-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-purple-900 mb-2">Edit & Export Component Coming Soon</h3>
        <p className="text-purple-800">
          This will include inline editing, export options (Markdown, HTML, etc.), 
          and SEO optimization features.
        </p>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-between items-center pt-6 border-t border-gray-100"
      >
        <div className="flex space-x-3">
          <Button 
            variant="outline"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleGoHome}
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>
        
        <Button 
          onClick={handleStartOver}
          size="lg"
          className="min-w-[140px]"
        >
          Create New Article
        </Button>
      </motion.div>
    </div>
  )
}