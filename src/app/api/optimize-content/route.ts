import { NextRequest, NextResponse } from 'next/server'
import { AIProviderType } from '@/types'
import { OpenAIProvider } from '@/lib/ai-providers/openai-provider'
import { GeminiProvider } from '@/lib/ai-providers/gemini-provider'
import { ClaudeProvider } from '@/lib/ai-providers/claude-provider'
import { OpenRouterProvider } from '@/lib/ai-providers/openrouter-provider'

interface OptimizationOptions {
  focus: 'seo' | 'readability' | 'engagement' | 'clarity'
  targetLength?: number
  tone?: 'professional' | 'casual' | 'academic'
}

interface OptimizeContentRequest {
  content: string
  options: OptimizationOptions
  provider: AIProviderType
  apiKey: string
}

const getProvider = (providerType: AIProviderType, apiKey: string) => {
  switch (providerType) {
    case 'openai':
      return new OpenAIProvider(apiKey)
    case 'gemini':
      return new GeminiProvider(apiKey)
    case 'anthropic':
      return new ClaudeProvider(apiKey)
    case 'openrouter':
      return new OpenRouterProvider(apiKey)
    default:
      throw new Error(`Unsupported provider: ${providerType}`)
  }
}

const buildOptimizationPrompt = (content: string, options: OptimizationOptions): string => {
  const { focus, targetLength, tone = 'professional' } = options

  let prompt = `Please optimize the following article content with a focus on ${focus}.\n\n`
  
  switch (focus) {
    case 'seo':
      prompt += `SEO Optimization Guidelines:
- Improve keyword density and natural keyword placement
- Enhance meta descriptions and headings
- Improve content structure for search engines
- Add relevant internal linking suggestions
- Ensure proper heading hierarchy (H1, H2, H3)
- Optimize for featured snippets and readability\n\n`
      break
    case 'readability':
      prompt += `Readability Optimization Guidelines:
- Simplify complex sentences and reduce passive voice
- Use shorter paragraphs (2-3 sentences each)
- Add transition words and clear topic sentences
- Break up long blocks of text with subheadings
- Use bullet points and numbered lists where appropriate
- Maintain a conversational and engaging tone\n\n`
      break
    case 'engagement':
      prompt += `Engagement Optimization Guidelines:
- Add compelling hooks and attention-grabbing opening
- Include relevant examples, stories, or case studies
- Use questions to engage readers
- Add calls-to-action throughout the content
- Include emotional triggers and power words
- Create curiosity gaps and compelling conclusions\n\n`
      break
    case 'clarity':
      prompt += `Clarity Optimization Guidelines:
- Define technical terms and jargon
- Use concrete examples instead of abstract concepts
- Organize content with clear logical flow
- Add explanatory context where needed
- Remove redundant or confusing passages
- Ensure each paragraph has a clear purpose\n\n`
      break
  }

  if (targetLength) {
    prompt += `Target length: Approximately ${targetLength} words.\n\n`
  }

  prompt += `Tone: ${tone}\n\n`

  prompt += `Original content to optimize:\n\n${content}\n\n`

  prompt += `Instructions:
1. Return ONLY the optimized content without any explanations or meta-commentary
2. Maintain the original structure and main ideas
3. Preserve the author's voice while improving the content
4. Do not add placeholder text or [brackets] for missing information
5. Ensure all content is complete and ready to publish

Optimized content:`

  return prompt
}

export async function POST(request: NextRequest) {
  try {
    const { content, options, provider, apiKey }: OptimizeContentRequest = await request.json()

    // Validate required fields
    if (!content || !options || !provider || !apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: content, options, provider, and apiKey are required' },
        { status: 400 }
      )
    }

    // Validate content length
    if (content.length < 50) {
      return NextResponse.json(
        { error: 'Content too short. Please provide at least 50 characters to optimize.' },
        { status: 400 }
      )
    }

    // Get the provider instance
    const aiProvider = getProvider(provider, apiKey)
    
    // Build optimization prompt
    const prompt = buildOptimizationPrompt(content, options)
    
    // Generate optimized content
    const response = await aiProvider.generateContent({
      prompt,
      options: {
        wordCount: options.targetLength || content.split(' ').length,
        tone: options.tone || 'professional',
        format: 'opinion',
        temperature: 0.3,
        maxTokens: Math.max(2000, Math.ceil(content.split(' ').length * 1.5))
      }
    })

    if (!response || !response.content) {
      return NextResponse.json(
        { error: 'Failed to generate optimized content' },
        { status: 500 }
      )
    }

    // Clean up the response
    const cleanedContent = response.content
      .replace(/^Optimized content:\s*/i, '') // Remove any prefix
      .replace(/^\s*["'`]+|["'`]+\s*$/g, '') // Remove quotes
      .trim()

    return NextResponse.json({ 
      optimizedContent: cleanedContent,
      originalLength: content.split(' ').length,
      optimizedLength: cleanedContent.split(' ').length,
      optimization: options.focus,
      provider
    })

  } catch (error) {
    console.error('Content optimization error:', error)
    
    // Handle specific provider errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid API key provided' },
          { status: 401 }
        )
      }
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'API rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to optimize content. Please try again.' },
      { status: 500 }
    )
  }
}