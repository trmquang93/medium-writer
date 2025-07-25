import { NextRequest, NextResponse } from 'next/server'
import { AIProviderFactory } from '@/lib/ai-providers/provider-factory'
import { promptTemplates } from '@/lib/prompt-templates'
import { 
  CategoryType, 
  Response, 
  AIProviderType,
  GeneratedLinkedInPost,
  LinkedInPost
} from '@/types'

interface GenerateLinkedInRequest {
  userInput: string
  category: CategoryType
  responses: Response[]
  provider: AIProviderType
  apiKey: string
  model?: string
}

interface GenerateLinkedInResponse {
  success: boolean
  content?: GeneratedLinkedInPost
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateLinkedInRequest = await request.json()
    const { userInput, category, responses, provider, apiKey, model } = body

    // Validate required fields
    if (!userInput || !category || !provider || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Initialize AI provider
    const aiProvider = AIProviderFactory.createProvider(provider, apiKey, model)
    
    // Validate API key
    const isValid = await aiProvider.validateApiKey()
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      )
    }

    // Build LinkedIn-specific prompt
    const linkedInPrompt = promptTemplates.buildLinkedInPrompt(
      category,
      userInput,
      responses || []
    )

    // Generate LinkedIn content with appropriate parameters
    const linkedInResponse = await aiProvider.generateContent({
      prompt: linkedInPrompt,
      options: {
        maxTokens: 2000,       // Increased to prevent MAX_TOKENS truncation 
        temperature: 0.8,      // More creative for social media
        wordCount: 350,        // Minimum word count that passes validation
        tone: 'professional',
        format: 'opinion'
      }
    })

    const linkedInContent = linkedInResponse.content

    // Parse LinkedIn content
    const parsedLinkedIn = parseLinkedInContent(linkedInContent, userInput)

    return NextResponse.json({
      success: true,
      content: parsedLinkedIn
    } as GenerateLinkedInResponse)

  } catch (error) {
    console.error('LinkedIn generation error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
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