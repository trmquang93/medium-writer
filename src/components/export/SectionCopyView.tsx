'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  MoreHorizontal,
  Hash,
  Type,
  List,
  Quote,
  Code,
  ExternalLink
} from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '@/lib/utils'
import { MediumContent, MediumSection, GistInfo } from '@/types'
import { mediumFormatter } from '@/services/MediumFormatter'

interface SectionCopyViewProps {
  content: string
  gists?: GistInfo[]
  onClose: () => void
}

interface SectionState {
  index: number
  copying: boolean
  copied: boolean
}

const getSectionIcon = (type: MediumSection['type']) => {
  switch (type) {
    case 'header': return Hash
    case 'paragraph': return Type
    case 'list': return List
    case 'quote': return Quote
    case 'code': return Code
    case 'gist-reference': return ExternalLink
    default: return Type
  }
}

const getSectionColor = (type: MediumSection['type']) => {
  switch (type) {
    case 'header': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'paragraph': return 'bg-gray-100 text-gray-700 border-gray-200'
    case 'list': return 'bg-green-100 text-green-700 border-green-200'
    case 'quote': return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'code': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'gist-reference': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export function SectionCopyView({ content, gists = [], onClose }: SectionCopyViewProps) {
  const [mediumContent, setMediumContent] = useState<MediumContent | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [sectionStates, setSectionStates] = useState<Record<number, SectionState>>({})
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    const parsed = mediumFormatter.convertToMediumFormat(content, gists)
    setMediumContent(parsed)
  }, [content, gists])

  const handleCopySection = async (index: number) => {
    if (!mediumContent) return

    const section = mediumContent.sections[index]
    const sectionHTML = mediumFormatter.generateSectionHTML(section, gists)

    setSectionStates(prev => ({
      ...prev,
      [index]: { ...prev[index], copying: true, copied: false }
    }))

    try {
      await navigator.clipboard.writeText(sectionHTML)
      setSectionStates(prev => ({
        ...prev,
        [index]: { index, copying: false, copied: true }
      }))

      // Reset copied state after 3 seconds
      setTimeout(() => {
        setSectionStates(prev => ({
          ...prev,
          [index]: { ...prev[index], copied: false }
        }))
      }, 3000)
    } catch (error) {
      console.error('Failed to copy section:', error)
      setSectionStates(prev => ({
        ...prev,
        [index]: { ...prev[index], copying: false, copied: false }
      }))
    }
  }

  const handleCopyAll = async () => {
    if (!mediumContent) return

    const allSectionsHTML = mediumContent.sections
      .map(section => mediumFormatter.generateSectionHTML(section, gists))
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(allSectionsHTML)
      // Mark all sections as copied
      const newStates: Record<number, SectionState> = {}
      mediumContent.sections.forEach((_, index) => {
        newStates[index] = { index, copying: false, copied: true }
      })
      setSectionStates(newStates)

      // Reset after 3 seconds
      setTimeout(() => {
        setSectionStates({})
      }, 3000)
    } catch (error) {
      console.error('Failed to copy all sections:', error)
    }
  }

  const navigateSection = (direction: 'prev' | 'next') => {
    if (!mediumContent) return

    if (direction === 'prev' && currentSection > 0) {
      setCurrentSection(currentSection - 1)
    } else if (direction === 'next' && currentSection < mediumContent.sections.length - 1) {
      setCurrentSection(currentSection + 1)
    }
  }

  if (!mediumContent) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const currentSectionData = mediumContent.sections[currentSection]
  const SectionIcon = getSectionIcon(currentSectionData.type)
  const sectionColorClass = getSectionColor(currentSectionData.type)
  const currentState = sectionStates[currentSection] || { copying: false, copied: false }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            Section-by-Section Copy
          </h3>
          <p className="text-gray-600 mt-1">
            Copy individual sections for easier Medium publishing
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            className="flex items-center space-x-2"
          >
            <Copy className="w-4 h-4" />
            <span>Copy All</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-blue-600 h-full transition-all duration-300"
          style={{ 
            width: `${((currentSection + 1) / mediumContent.sections.length) * 100}%` 
          }}
        />
      </div>

      {/* Section Navigation */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateSection('prev')}
          disabled={currentSection === 0}
          className="flex items-center space-x-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </Button>

        <div className="flex items-center space-x-4">
          <div className={cn(
            "flex items-center space-x-2 px-3 py-1 rounded-full border",
            sectionColorClass
          )}>
            <SectionIcon className="w-4 h-4" />
            <span className="text-sm font-medium capitalize">
              {currentSectionData.type.replace('-', ' ')}
            </span>
          </div>
          
          <span className="text-sm text-gray-500">
            {currentSection + 1} of {mediumContent.sections.length}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateSection('next')}
          disabled={currentSection === mediumContent.sections.length - 1}
          className="flex items-center space-x-2"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Current Section Display */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SectionIcon className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">
              Section {currentSection + 1}
            </span>
            {currentSectionData.type === 'header' && currentSectionData.level && (
              <span className="text-sm text-gray-500">
                (H{currentSectionData.level})
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center space-x-1"
            >
              <Eye className="w-4 h-4" />
              <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
            </Button>
            
            <Button
              onClick={() => handleCopySection(currentSection)}
              disabled={currentState.copying}
              size="sm"
              className={cn(
                "min-w-[80px]",
                currentState.copied && "bg-green-600 hover:bg-green-700"
              )}
            >
              {currentState.copying ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : currentState.copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Section Content */}
        <div className="p-6">
          {currentSectionData.type === 'gist-reference' && currentSectionData.gistId && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-800">
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-medium">GitHub Gist Reference</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                This section references a GitHub Gist that was created during export.
              </p>
            </div>
          )}

          <div className="prose max-w-none">
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Raw Content:</h4>
              <div className="bg-gray-50 rounded p-3 font-mono text-sm">
                {currentSectionData.content}
              </div>
            </div>

            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <h4 className="text-sm font-medium text-gray-700 mb-2">HTML Preview:</h4>
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: mediumFormatter.generateSectionHTML(currentSectionData, gists)
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Section Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {mediumContent.sections.map((section, index) => {
          const Icon = getSectionIcon(section.type)
          const colorClass = getSectionColor(section.type)
          const state = sectionStates[index]
          const isActive = index === currentSection

          return (
            <motion.div
              key={`${section.id}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-3 border rounded-lg cursor-pointer transition-all duration-200",
                isActive 
                  ? "border-blue-500 bg-blue-50 shadow-md" 
                  : "border-gray-200 bg-white hover:shadow-sm",
                state?.copied && "border-green-500 bg-green-50"
              )}
              onClick={() => setCurrentSection(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">
                    Section {index + 1}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <div className={cn(
                    "px-2 py-1 rounded text-xs border",
                    colorClass
                  )}>
                    {section.type.replace('-', ' ')}
                  </div>
                  
                  {state?.copied && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </div>
              
              <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                {section.content.length > 60 
                  ? `${section.content.substring(0, 60)}...`
                  : section.content
                }
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* Copy All Success */}
      <AnimatePresence>
        {Object.values(sectionStates).every(state => state.copied) &&
         Object.keys(sectionStates).length === mediumContent.sections.length && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center justify-center space-x-2 text-green-800">
              <Check className="w-5 h-5" />
              <span className="font-medium">All sections copied!</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              You can now paste them into Medium one by one
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}