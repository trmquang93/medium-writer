'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { WorkflowStep } from '@/store/workflowStore'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  description: string
}

interface ProgressIndicatorProps {
  steps: Step[]
  currentStep: WorkflowStep
}

const stepOrder: WorkflowStep[] = ['input', 'category', 'questions', 'generation', 'edit']

export function ProgressIndicator({ steps, currentStep }: ProgressIndicatorProps) {
  const currentStepIndex = stepOrder.indexOf(currentStep)

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex
          const isCurrent = index === currentStepIndex
          const isUpcoming = index > currentStepIndex

          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <div className="relative flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    {
                      "bg-green-500 border-green-500 text-white": isCompleted,
                      "bg-blue-500 border-blue-500 text-white": isCurrent,
                      "bg-gray-100 border-gray-300 text-gray-400": isUpcoming
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </motion.div>

                {/* Step Info */}
                <div className="mt-2 text-center min-w-0">
                  <motion.h3
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.1 }}
                    className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      {
                        "text-green-600": isCompleted,
                        "text-blue-600": isCurrent,
                        "text-gray-400": isUpcoming
                      }
                    )}
                  >
                    {step.title}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                    className={cn(
                      "text-xs transition-colors duration-300 mt-1",
                      {
                        "text-green-500": isCompleted,
                        "text-blue-500": isCurrent,
                        "text-gray-400": isUpcoming
                      }
                    )}
                  >
                    {step.description}
                  </motion.p>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.3 }}
                  className="flex-1 mx-4"
                >
                  <div className="h-0.5 bg-gray-200 relative overflow-hidden">
                    <motion.div
                      initial={{ x: '-100%' }}
                      animate={{ 
                        x: isCompleted ? '0%' : '-100%'
                      }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      {/* Current Step Details */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-6"
      >
        <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse" />
          <span className="text-blue-700 text-sm font-medium">
            Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex]?.title}
          </span>
        </div>
      </motion.div>
    </div>
  )
}