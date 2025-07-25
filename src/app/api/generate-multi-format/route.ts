import { NextRequest, NextResponse } from 'next/server'
import { AIProviderFactory } from '@/lib/ai-providers/provider-factory'
import { promptTemplates } from '@/lib/prompt-templates'
import { 
  CategoryType, 
  Response, 
  ContentFormat, 
  GenerationOptions, 
  AIProviderType,
  Article,
  GeneratedLinkedInPost,
  LinkedInPost
} from '@/types'

interface GenerateMultiFormatRequest {
  userInput: string
  category: CategoryType
  responses: Response[]
  formats: ContentFormat[]
  provider: AIProviderType
  apiKey: string
  options: GenerationOptions
}

interface GenerateMultiFormatResponse {
  success: boolean
  content: {
    medium?: Article
    linkedin?: GeneratedLinkedInPost
  }
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateMultiFormatRequest = await request.json()
    const { userInput, category, responses, formats, provider, apiKey, options } = body

    // Validate required fields
    if (!userInput || !category || !formats || formats.length === 0 || !provider || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Initialize AI provider
    const aiProvider = AIProviderFactory.createProvider(provider, apiKey)
    
    // Validate API key
    const isValid = await aiProvider.validateApiKey()
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      )
    }

    const content: { medium?: Article; linkedin?: GeneratedLinkedInPost } = {}

    // Generate Medium article if requested
    if (formats.includes('medium')) {
      try {
        const articlePrompt = promptTemplates.buildArticlePrompt(
          category,
          userInput,
          responses,
          options
        )

        const articleResponse = await aiProvider.generateContent({
          prompt: articlePrompt,
          options: {
            ...options,
            maxTokens: 4000,
            temperature: 0.7
          }
        })

        const articleContent = articleResponse.content

        // Parse and structure the article
        content.medium = {
          id: generateId(),
          title: extractTitle(articleContent) || userInput,
          content: articleContent,
          category: { primary: category, confidence: 1.0 },
          metadata: {
            tags: extractTags(articleContent),
            description: extractDescription(articleContent),
            seoTitle: extractTitle(articleContent) || userInput,
            seoDescription: extractDescription(articleContent)
          },
          generatedAt: new Date(),
          wordCount: countWords(articleContent),
          readingTime: Math.ceil(countWords(articleContent) / 200)
        }
      } catch (error) {
        console.error('Error generating Medium article:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to generate Medium article' },
          { status: 500 }
        )
      }
    }

    // Generate LinkedIn post if requested
    if (formats.includes('linkedin')) {
      try {
        const linkedInPrompt = promptTemplates.buildLinkedInPrompt(
          category,
          userInput,
          responses
        )

        const linkedInResponse = await aiProvider.generateContent({
          prompt: linkedInPrompt,
          options: {
            maxTokens: 1000,
            temperature: 0.8,
            wordCount: 200, // Short LinkedIn post
            tone: 'professional',
            format: 'opinion'
          }
        })

        const linkedInContent = linkedInResponse.content

        // Parse LinkedIn content
        const parsedLinkedIn = parseLinkedInContent(linkedInContent, userInput)
        content.linkedin = parsedLinkedIn
      } catch (error) {
        console.error('Error generating LinkedIn post:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to generate LinkedIn post' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      content
    } as GenerateMultiFormatResponse)

  } catch (error) {
    console.error('Multi-format generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function extractTitle(content: string): string | null {
  // Look for markdown title (# Title)
  const titleMatch = content.match(/^#\s+(.+)$/m)
  if (titleMatch) {
    return titleMatch[1].trim()
  }
  
  // Look for title in first line
  const firstLine = content.split('\n')[0]
  if (firstLine && firstLine.length < 100) {
    return firstLine.replace(/^#+\s*/, '').trim()
  }
  
  return null
}

function extractDescription(content: string): string {
  // Extract first paragraph as description
  const paragraphs = content.split('\n\n')
  for (const paragraph of paragraphs) {
    const cleaned = paragraph.replace(/^#+\s*/, '').trim()
    if (cleaned && cleaned.length > 50 && cleaned.length < 300) {
      return cleaned
    }
  }
  
  // Fallback to first 150 characters
  return content.substring(0, 150).trim() + '...'
}

function extractTags(content: string): string[] {
  // Simple tag extraction based on common technical terms
  const commonTags = [
    'technology', 'programming', 'development', 'ai', 'machine learning',
    'web development', 'javascript', 'python', 'react', 'nodejs',
    'personal development', 'productivity', 'leadership', 'career',
    'business', 'entrepreneurship', 'startup', 'marketing',
    'lifestyle', 'health', 'wellness', 'mindfulness'
  ]
  
  const contentLower = content.toLowerCase()
  const foundTags = commonTags.filter(tag => 
    contentLower.includes(tag.toLowerCase())
  )
  
  return foundTags.slice(0, 5) // Limit to 5 tags
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length
}

function parseLinkedInContent(content: string, originalInput: string): GeneratedLinkedInPost {
  // Clean up the content
  const cleanContent = content.trim()
  
  // Extract hashtags
  const hashtagMatches = cleanContent.match(/#\w+/g) || []
  const hashtags = hashtagMatches.map(tag => tag.substring(1))
  
  // Remove hashtags from main content for character count
  const contentWithoutHashtags = cleanContent.replace(/#\w+/g, '').trim()
  
  // Determine post type based on content analysis
  const postType = determinePostType(contentWithoutHashtags)
  
  // Create LinkedIn post
  const linkedInPost: LinkedInPost = {
    id: generateId(),
    content: cleanContent,
    characterCount: cleanContent.length,
    hashtags,
    postType,
    callToAction: extractCallToAction(cleanContent)
  }

  return {
    posts: [linkedInPost],
    strategy: `Generated ${postType} post optimized for LinkedIn engagement`,
    totalCharacters: cleanContent.length,
    hashtagStrategy: hashtags
  }
}

function determinePostType(content: string): LinkedInPost['postType'] {
  const contentLower = content.toLowerCase()
  
  if (contentLower.includes('how to') || contentLower.includes('learn') || contentLower.includes('tutorial')) {
    return 'educational'
  }
  if (contentLower.includes('story') || contentLower.includes('experience') || contentLower.includes('journey')) {
    return 'personal-story'
  }
  if (contentLower.includes('?') && contentLower.includes('what') || contentLower.includes('thoughts')) {
    return 'engagement'
  }
  if (contentLower.includes('trend') || contentLower.includes('future') || contentLower.includes('insight')) {
    return 'thought-leadership'
  }
  
  return 'industry-insight'
}

function extractCallToAction(content: string): string | undefined {
  // Look for common CTA patterns
  const ctaPatterns = [
    /What do you think\?/i,
    /Share your thoughts/i,
    /Let me know/i,
    /Comment below/i,
    /What's your experience\?/i
  ]
  
  for (const pattern of ctaPatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[0]
    }
  }
  
  return undefined
}