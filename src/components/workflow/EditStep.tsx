'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Edit3, 
  Download, 
  Home, 
  Copy, 
  FileText, 
  Code, 
  Globe, 
  Check, 
  Clock, 
  Eye, 
  BarChart3, 
  Tag, 
  Save, 
  RefreshCw,
  Sparkles,
  Users,
  Target 
} from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { Button } from '../ui/Button'
import { cn } from '@/lib/utils'
import { ExportFormat } from '@/types'
import { MediumExportPanel } from '../export/MediumExportPanel'

interface ExportState {
  format: ExportFormat | null
  isExporting: boolean
  success: boolean
}

// Helper functions for content manipulation
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

const calculateReadingTime = (wordCount: number): number => {
  return Math.ceil(wordCount / 200) // Average 200 words per minute
}

const extractTitle = (content: string): string => {
  const titleMatch = content.match(/^#\s+(.+)$/m)
  return titleMatch ? titleMatch[1].trim() : 'Untitled Article'
}

// LinkedIn-specific helper functions
const countCharacters = (text: string): number => {
  return text.length
}

const extractLinkedInHashtags = (content: string): string[] => {
  const hashtagMatches = content.match(/#\w+/g) || []
  return hashtagMatches.map(tag => tag.substring(1))
}

const getLinkedInCharacterStatus = (length: number): 'optimal' | 'good' | 'warning' | 'error' => {
  if (length >= 800 && length <= 1300) return 'optimal'
  if (length >= 500 && length <= 1500) return 'good'
  if (length >= 300 && length <= 2000) return 'warning'
  return 'error'
}

const convertToMarkdown = (content: string): string => {
  return content // Already in markdown format
}

const convertToHtml = (content: string): string => {
  return content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/^(?!<[hl]|<li)/gim, '<p>')
    .replace(/$/gim, '</p>')
    .replace(/<p><\/p>/gim, '')
    .replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>')
}

const convertToPlainText = (content: string): string => {
  return content
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^\-\s+/gm, '• ')
    .trim()
}

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    return false
  }
}

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function EditStep() {
  const { 
    selectedFormats,
    generatedArticle, 
    generatedLinkedIn,
    updateGeneratedArticle,
    updateGeneratedLinkedIn,
    resetWorkflow, 
    setCurrentStep 
  } = useWorkflowStore()
  
  const [activeTab, setActiveTab] = useState<'medium' | 'linkedin'>('medium')
  const [content, setContent] = useState('')
  const [linkedInContent, setLinkedInContent] = useState('')
  const [exportState, setExportState] = useState<ExportState>({
    format: null,
    isExporting: false,
    success: false
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const linkedInTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialize content when article is available
  useEffect(() => {
    if (generatedArticle) {
      setContent(generatedArticle.content)
    }
  }, [generatedArticle])

  // Initialize LinkedIn content when available
  useEffect(() => {
    if (generatedLinkedIn && generatedLinkedIn.posts && generatedLinkedIn.posts.length > 0) {
      setLinkedInContent(generatedLinkedIn.posts[0].content)
    }
  }, [generatedLinkedIn])

  // Set default active tab based on available content
  useEffect(() => {
    if (selectedFormats.length === 1) {
      setActiveTab(selectedFormats[0] === 'linkedin' ? 'linkedin' : 'medium')
    } else if (selectedFormats.includes('medium') && !generatedArticle && generatedLinkedIn) {
      setActiveTab('linkedin')
    } else if (selectedFormats.includes('linkedin') && !generatedLinkedIn && generatedArticle) {
      setActiveTab('medium')
    } else if (selectedFormats.includes('medium') && generatedArticle) {
      setActiveTab('medium')
    } else if (selectedFormats.includes('linkedin') && generatedLinkedIn && generatedLinkedIn.posts && generatedLinkedIn.posts.length > 0) {
      setActiveTab('linkedin')
    }
  }, [selectedFormats, generatedArticle, generatedLinkedIn])

  // Auto-resize textarea - disabled to allow scrolling
  // useEffect(() => {
  //   if (textareaRef.current) {
  //     textareaRef.current.style.height = 'auto'
  //     textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
  //   }
  // }, [content])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setHasUnsavedChanges(true)
    
    // Auto-save after 2 seconds of no changes
    const timeout = setTimeout(() => {
      handleSave()
    }, 2000)
    
    return () => clearTimeout(timeout)
  }

  const handleSave = () => {
    if (activeTab === 'medium' && generatedArticle) {
      const wordCount = countWords(content)
      const readingTime = calculateReadingTime(wordCount)
      const title = extractTitle(content)
      
      updateGeneratedArticle({
        content: content.trim(),
        title,
        wordCount,
        readingTime,
        modifiedAt: new Date()
      })
    } else if (activeTab === 'linkedin' && generatedLinkedIn && generatedLinkedIn.posts && generatedLinkedIn.posts.length > 0) {
      const characterCount = countCharacters(linkedInContent)
      const hashtags = extractLinkedInHashtags(linkedInContent)
      
      const updatedPost = {
        ...generatedLinkedIn.posts[0],
        content: linkedInContent.trim(),
        characterCount,
        hashtags
      }
      
      updateGeneratedLinkedIn({
        posts: [updatedPost],
        totalCharacters: characterCount,
        hashtagStrategy: hashtags
      })
    }
    
    setHasUnsavedChanges(false)
  }

  const handleExport = async (format: ExportFormat) => {
    const currentContent = activeTab === 'medium' ? content : linkedInContent
    if (!currentContent.trim()) return

    setExportState({ format, isExporting: true, success: false })

    try {
      let exportContent: string
      let filename: string
      let mimeType: string

      const title = activeTab === 'medium' 
        ? extractTitle(currentContent).replace(/[^a-z0-9]/gi, '_').toLowerCase()
        : 'linkedin_post'

      switch (format) {
        case 'markdown':
          exportContent = convertToMarkdown(currentContent)
          filename = `${title}.md`
          mimeType = 'text/markdown'
          downloadFile(exportContent, filename, mimeType)
          break
        case 'linkedin-post':
          exportContent = currentContent
          filename = `${title}.txt`
          mimeType = 'text/plain'
          downloadFile(exportContent, filename, mimeType)
          break
        case 'html':
          exportContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${extractTitle(content)}</title>
  <style>
    body { max-width: 800px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
    h1, h2, h3 { color: #333; }
    p { margin-bottom: 1em; }
    ul { margin-bottom: 1em; }
  </style>
</head>
<body>
${convertToHtml(content)}
</body>
</html>`
          filename = `${title}.html`
          mimeType = 'text/html'
          downloadFile(exportContent, filename, mimeType)
          break
        case 'text':
          exportContent = convertToPlainText(content)
          filename = `${title}.txt`
          mimeType = 'text/plain'
          downloadFile(exportContent, filename, mimeType)
          break
        case 'clipboard':
          const success = await copyToClipboard(content)
          if (!success) throw new Error('Failed to copy to clipboard')
          break
        default:
          throw new Error('Unsupported format')
      }

      setExportState({ format, isExporting: false, success: true })
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setExportState(prev => ({ ...prev, success: false }))
      }, 3000)

    } catch (error) {
      console.error('Export failed:', error)
      setExportState({ format, isExporting: false, success: false })
    }
  }

  const handleCopyToClipboard = async () => {
    const success = await copyToClipboard(content)
    if (success) {
      setExportState({ format: 'clipboard' as any, isExporting: false, success: true })
      setTimeout(() => setExportState(prev => ({ ...prev, success: false })), 3000)
    }
  }

  const handleStartOver = () => {
    resetWorkflow()
  }

  const handleBack = () => {
    setCurrentStep('generation')
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  if (!generatedArticle && !generatedLinkedIn) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Found</h3>
        <p className="text-gray-600 mb-4">Please generate content first.</p>
        <Button onClick={() => setCurrentStep('generation')}>
          Back to Generation
        </Button>
      </div>
    )
  }

  const wordCount = countWords(content)
  const readingTime = calculateReadingTime(wordCount)

  return (
    <div className="space-y-6">
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
          Edit & Export Your Content
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600"
        >
          Fine-tune your content and export it in your preferred format.
        </motion.p>
      </div>

      {/* Format Selection Tabs */}
      {selectedFormats.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex space-x-1 bg-gray-100 p-1 rounded-lg"
        >
          {selectedFormats.includes('medium') && generatedArticle && (
            <button
              onClick={() => setActiveTab('medium')}
              className={cn(
                "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === 'medium'
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Medium Article
            </button>
          )}
          {selectedFormats.includes('linkedin') && generatedLinkedIn && (
            <button
              onClick={() => setActiveTab('linkedin')}
              className={cn(
                "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === 'linkedin'
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Users className="w-4 h-4 inline mr-2" />
              LinkedIn Post
            </button>
          )}
        </motion.div>
      )}

      {/* Content Metadata */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200"
      >
        {activeTab === 'medium' && generatedArticle ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <div>
                <span className="text-gray-600 block">Words</span>
                <span className="font-semibold text-gray-900">{wordCount.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-green-600" />
              <div>
                <span className="text-gray-600 block">Reading Time</span>
                <span className="font-semibold text-gray-900">{readingTime} min</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-purple-600" />
              <div>
                <span className="text-gray-600 block">Category</span>
                <span className="font-semibold text-gray-900 capitalize">
                  {generatedArticle?.category.primary.toLowerCase().replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-yellow-600" />
              <div>
                <span className="text-gray-600 block">Status</span>
                <span className="font-semibold text-gray-900">
                  {hasUnsavedChanges ? 'Modified' : 'Saved'}
                </span>
              </div>
            </div>
          </div>
        ) : activeTab === 'linkedin' && generatedLinkedIn ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <div>
                <span className="text-gray-600 block">Characters</span>
                <span className="font-semibold text-gray-900">{countCharacters(linkedInContent)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-green-600" />
              <div>
                <span className="text-gray-600 block">Hashtags</span>
                <span className="font-semibold text-gray-900">{extractLinkedInHashtags(linkedInContent).length}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-purple-600" />
              <div>
                <span className="text-gray-600 block">Optimization</span>
                <span className={cn(
                  "font-semibold",
                  getLinkedInCharacterStatus(countCharacters(linkedInContent)) === 'optimal' ? 'text-green-600' :
                  getLinkedInCharacterStatus(countCharacters(linkedInContent)) === 'good' ? 'text-blue-600' :
                  getLinkedInCharacterStatus(countCharacters(linkedInContent)) === 'warning' ? 'text-yellow-600' :
                  'text-red-600'
                )}>
                  {getLinkedInCharacterStatus(countCharacters(linkedInContent)).charAt(0).toUpperCase() + 
                   getLinkedInCharacterStatus(countCharacters(linkedInContent)).slice(1)}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-yellow-600" />
              <div>
                <span className="text-gray-600 block">Status</span>
                <span className="font-semibold text-gray-900">
                  {hasUnsavedChanges ? 'Modified' : 'Saved'}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </motion.div>

      {/* Content Editor */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Edit3 className="w-5 h-5 mr-2" />
            {activeTab === 'medium' ? 'Article Content' : 'LinkedIn Post Content'}
          </h3>
          <div className="flex space-x-2">
            {hasUnsavedChanges && (
              <Button
                onClick={handleSave}
                size="sm"
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
          {activeTab === 'medium' ? (
            <>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full min-h-[500px] p-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm leading-relaxed"
                placeholder="Start writing your article..."
                style={{ minHeight: '500px' }}
              />
              {hasUnsavedChanges && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </>
          ) : (
            <>
              <textarea
                ref={linkedInTextareaRef}
                value={linkedInContent}
                onChange={(e) => {
                  setLinkedInContent(e.target.value)
                  setHasUnsavedChanges(true)
                }}
                className="w-full min-h-[300px] p-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm leading-relaxed"
                placeholder="Write your LinkedIn post..."
              />
              {hasUnsavedChanges && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                </div>
              )}
              
              {/* LinkedIn-specific tips */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">LinkedIn Optimization Tips:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-800">
                  <div>• Optimal: 800-1300 characters</div>
                  <div>• Include 3-5 relevant hashtags</div>
                  <div>• Add a call-to-action</div>
                  <div>• Use emojis sparingly</div>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Medium Export Options */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-6"
      >
        <MediumExportPanel 
          content={content}
          onExportComplete={(result) => {
            console.log('Export completed:', result)
          }}
        />
        
        {/* Legacy Export Options */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Standard Export Options
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { format: 'markdown' as ExportFormat, icon: FileText, label: 'Markdown', desc: '.md file' },
              { format: 'html' as ExportFormat, icon: Globe, label: 'HTML', desc: '.html file' },
              { format: 'text' as ExportFormat, icon: Code, label: 'Plain Text', desc: '.txt file' },
              { format: 'clipboard' as any, icon: Copy, label: 'Copy', desc: 'To clipboard' }
            ].map(({ format, icon: Icon, label, desc }) => (
              <Button
                key={format}
                onClick={() => format === 'clipboard' ? handleCopyToClipboard() : handleExport(format)}
                variant="outline"
                size="sm"
                disabled={!content.trim() || exportState.isExporting}
                className={cn(
                  "h-auto p-4 flex flex-col items-center space-y-2 transition-all duration-200",
                  exportState.success && exportState.format === format && "border-green-500 bg-green-50"
                )}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  <AnimatePresence>
                    {exportState.success && exportState.format === format && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-2 h-2 text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="text-center">
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
              </Button>
            ))}
          </div>
          
          {exportState.success && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-800"
            >
              <Check className="w-4 h-4" />
              <span className="text-sm">
                {exportState.format === 'clipboard' ? 
                  'Content copied to clipboard!' : 
                  'File exported successfully!'
                }
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex justify-between items-center pt-6 border-t border-gray-100"
      >
        <div className="flex space-x-3">
          <Button 
            variant="outline"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Generation
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