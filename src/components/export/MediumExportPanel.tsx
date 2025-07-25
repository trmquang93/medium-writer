'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Download, 
  Copy, 
  Check, 
  Eye, 
  Github, 
  FileText, 
  Globe, 
  Layers,
  Settings,
  ExternalLink,
  AlertCircle,
  Loader2,
  Target
} from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '@/lib/utils'
import { ExportFormat, MediumExportOptions, GistInfo } from '@/types'
import { mediumExportService, ExportResult } from '@/services/MediumExportService'

interface MediumExportPanelProps {
  content: string
  onExportComplete?: (result: ExportResult) => void
}

interface ExportState {
  format: ExportFormat | null
  isExporting: boolean
  success: boolean
  error?: string
  result?: ExportResult
}

export function MediumExportPanel({ content, onExportComplete }: MediumExportPanelProps) {
  const [exportState, setExportState] = useState<ExportState>({
    format: null,
    isExporting: false,
    success: false
  })
  
  const [githubToken, setGithubToken] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const exportOptions = [
    {
      format: 'medium-optimized' as ExportFormat,
      icon: Target,
      title: 'Medium Optimized',
      description: 'Perfect formatting for Medium editor',
      color: 'bg-green-500',
      recommended: true
    },
    {
      format: 'medium-sections' as ExportFormat,
      icon: Layers,
      title: 'Section by Section',
      description: 'Copy individual sections separately',
      color: 'bg-blue-500',
      recommended: false
    },
    {
      format: 'rich-html' as ExportFormat,
      icon: Globe,
      title: 'Rich HTML',
      description: 'Styled HTML with Medium design',
      color: 'bg-purple-500',
      recommended: false
    }
  ]

  const handleExport = async (format: ExportFormat) => {
    if (!content.trim()) return

    setExportState({ format, isExporting: true, success: false })

    try {
      const exportOptions: Partial<MediumExportOptions> = {
        createGists: !!githubToken,
        githubToken: githubToken || undefined,
        optimizeForMedium: format === 'medium-optimized',
        splitSections: format === 'medium-sections'
      }

      const result = await mediumExportService.exportContent(content, format, exportOptions)
      
      if (result.success) {
        // Copy to clipboard
        await navigator.clipboard.writeText(result.content)
        
        setExportState({ 
          format, 
          isExporting: false, 
          success: true, 
          result 
        })
        
        onExportComplete?.(result)
        
        // Reset success state after 3 seconds
        setTimeout(() => {
          setExportState(prev => ({ ...prev, success: false }))
        }, 3000)
      } else {
        throw new Error(result.error || 'Export failed')
      }
    } catch (error) {
      console.error('Export failed:', error)
      setExportState({ 
        format, 
        isExporting: false, 
        success: false, 
        error: error instanceof Error ? error.message : 'Export failed'
      })
    }
  }

  const handlePreview = async (format: ExportFormat) => {
    try {
      const result = await mediumExportService.exportContent(content, format, {
        createGists: false,
        optimizeForMedium: format === 'medium-optimized'
      })
      
      if (result.success) {
        setPreviewContent(result.content)
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Preview failed:', error)
    }
  }

  const downloadFile = (result: ExportResult) => {
    if (!result.filename || !result.content) return
    
    const blob = new Blob([result.content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Export for Medium
        </h3>
        <p className="text-gray-600">
          Choose the best format for seamless Medium publishing
        </p>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
          >
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Github className="w-4 h-4 mr-2" />
              GitHub Integration
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GitHub Personal Access Token (Optional)
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required to create GitHub Gists for code blocks. 
                  <a 
                    href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline ml-1"
                  >
                    Learn how to create one
                    <ExternalLink className="w-3 h-3 inline ml-1" />
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Options */}
      <div className="grid gap-4">
        {exportOptions.map((option) => (
          <div
            key={option.format}
            className={cn(
              "border rounded-lg p-4 hover:shadow-md transition-all duration-200",
              option.recommended 
                ? "border-green-200 bg-green-50" 
                : "border-gray-200 bg-white"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  option.color
                )}>
                  <option.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">
                      {option.title}
                    </h4>
                    {option.recommended && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {option.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(option.format)}
                  className="h-8"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={() => handleExport(option.format)}
                  disabled={!content.trim() || exportState.isExporting}
                  size="sm"
                  className={cn(
                    "h-8 min-w-[80px]",
                    exportState.success && exportState.format === option.format && 
                    "bg-green-600 hover:bg-green-700"
                  )}
                >
                  {exportState.isExporting && exportState.format === option.format ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : exportState.success && exportState.format === option.format ? (
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

            {/* Export Result Details */}
            <AnimatePresence>
              {exportState.success && exportState.format === option.format && exportState.result && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      {exportState.result.gists && exportState.result.gists.length > 0 && (
                        <span className="flex items-center">
                          <Github className="w-4 h-4 mr-1" />
                          {exportState.result.gists.length} Gist{exportState.result.gists.length > 1 ? 's' : ''} created
                        </span>
                      )}
                      {exportState.result.sections && (
                        <span>
                          {exportState.result.sections.length} sections ready
                        </span>
                      )}
                    </div>
                    
                    {exportState.result.filename && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(exportState.result!)}
                        className="h-7"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>

                  {/* Show Gists */}
                  {exportState.result.gists && exportState.result.gists.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium text-gray-700">Created Gists:</p>
                      {exportState.result.gists.map((gist) => (
                        <div key={gist.id} className="flex items-center justify-between bg-white rounded p-2 border">
                          <span className="text-sm">
                            <code className="text-xs bg-gray-100 px-1 rounded">{gist.language}</code>
                            <span className="ml-2">{gist.filename}</span>
                          </span>
                          <a
                            href={gist.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm flex items-center"
                          >
                            View Gist
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Display */}
            <AnimatePresence>
              {exportState.error && exportState.format === option.format && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-red-200"
                >
                  <div className="flex items-center space-x-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{exportState.error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Settings Toggle */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center space-x-2"
        >
          <Settings className="w-4 h-4" />
          <span>{showSettings ? 'Hide' : 'Show'} Settings</span>
        </Button>
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {exportState.success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center justify-center space-x-2 text-green-800">
              <Check className="w-5 h-5" />
              <span className="font-medium">Content copied to clipboard!</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Ready to paste directly into Medium's editor
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Export Preview</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  Close
                </Button>
              </div>
              <div className="p-6 overflow-auto max-h-[calc(80vh-120px)]">
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewContent }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}