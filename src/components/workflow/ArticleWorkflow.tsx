'use client'

import { motion } from 'framer-motion'
import { useWorkflowStore } from '@/store/workflowStore'
import { InputStep } from './InputStep'
import { CategoryStep } from './CategoryStep'
import { QuestionStep } from './QuestionStep'
import { GenerationStep } from './GenerationStep'
import { EditStep } from './EditStep'
import { ProgressIndicator } from './ProgressIndicator'
import { cn } from '@/lib/utils'

const steps = [
  { id: 'input', title: 'Your Idea', description: 'Share your article concept' },
  { id: 'category', title: 'Category', description: 'Confirm content type' },
  { id: 'questions', title: 'Questions', description: 'Provide details' },
  { id: 'generation', title: 'Generate', description: 'Create your article' },
  { id: 'edit', title: 'Edit', description: 'Refine and export' }
]

export function ArticleWorkflow() {
  const { currentStep } = useWorkflowStore()

  const renderStep = () => {
    switch (currentStep) {
      case 'input':
        return <InputStep />
      case 'category':
        return <CategoryStep />
      case 'questions':
        return <QuestionStep />
      case 'generation':
        return <GenerationStep />
      case 'edit':
        return <EditStep />
      default:
        return <InputStep />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2"
          >
            Create Your Medium Article
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 text-lg"
          >
            Transform your ideas into compelling content in minutes
          </motion.p>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator steps={steps} currentStep={currentStep} />

        {/* Main Content Area */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl p-8">
            {renderStep()}
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Your API keys are stored securely and never saved permanently</p>
        </div>
      </div>
    </div>
  )
}