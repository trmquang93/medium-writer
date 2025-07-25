import { NextRequest, NextResponse } from 'next/server'
import { AIProviderType, ContentCategory, Article, Response, GenerationOptions } from '@/types'
import { promptTemplates } from '@/lib/prompt-templates'
import { AIProviderFactory } from '@/lib/ai-providers/provider-factory'

// Helper function to create fetch requests with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 50000): Promise<globalThis.Response> {
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: abortController.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`)
    }
    throw error
  }
}

// Helper function to generate unique article ID
function generateArticleId(): string {
  return `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Helper function to calculate reading time (average 200 words per minute)
function calculateReadingTime(wordCount: number): number {
  return Math.ceil(wordCount / 200)
}

// Helper function to count words
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

// Helper function to extract title from content
function extractTitleFromContent(content: string): string {
  // Look for the first # heading
  const titleMatch = content.match(/^#\s+(.+)$/m)
  if (titleMatch) {
    return titleMatch[1].trim()
  }
  
  // Fallback: use first line if no heading found
  const firstLine = content.split('\n')[0].trim()
  return firstLine.replace(/^#+\s*/, '') || 'Untitled Article'
}

// Helper function to generate tags from content
function generateTags(content: string, category: ContentCategory): string[] {
  const categoryTags: Record<string, string[]> = {
    'TECHNOLOGY': ['Technology', 'Programming', 'AI', 'Development'],
    'PERSONAL_DEVELOPMENT': ['Personal Development', 'Self Improvement', 'Productivity'],
    'BUSINESS': ['Business', 'Entrepreneurship', 'Strategy', 'Leadership'],
    'LIFESTYLE': ['Lifestyle', 'Health', 'Wellness', 'Life'],
    'CURRENT_AFFAIRS': ['Current Affairs', 'Politics', 'Society', 'Opinion']
  }
  
  const baseTags = categoryTags[category.primary] || []
  
  // Add secondary category tags if available
  if (category.secondary) {
    baseTags.push(...(categoryTags[category.secondary] || []))
  }
  
  return Array.from(new Set(baseTags)).slice(0, 5) // Limit to 5 unique tags
}

export async function POST(request: NextRequest) {
  try {
    const { input, category, responses, provider, model, apiKey, options } = await request.json()

    // Validate required parameters
    if (!input || !category || !provider || !apiKey) {
      return NextResponse.json(
        { error: 'Input, category, provider, and API key are required' },
        { status: 400 }
      )
    }

    // Validate category structure
    if (!category.primary) {
      return NextResponse.json(
        { error: 'Category must have a primary classification' },
        { status: 400 }
      )
    }

    // Default generation options
    const generationOptions: GenerationOptions = {
      wordCount: 1500,
      tone: 'professional',
      format: 'analysis',
      temperature: 0.7,
      maxTokens: 4000,
      ...options
    }

    // Prepare responses array, handling both array and individual response formats
    let articleResponses: Response[] = []
    if (responses) {
      if (Array.isArray(responses)) {
        articleResponses = responses
      } else {
        // Convert single response object to array format
        articleResponses = Object.entries(responses).map(([questionId, answer]) => ({
          questionId,
          question: questionId, // Fallback if question text not available
          answer: String(answer),
          timestamp: new Date()
        }))
      }
    }

    // Generate the article prompt using the template system
    const articlePrompt = promptTemplates.buildArticlePrompt(
      category.primary,
      input,
      articleResponses,
      generationOptions
    )

    let articleContent: string = ''
    let generationError: string | null = null

    try {
      // Generate article content using the selected AI provider
      switch (provider as AIProviderType) {
        case 'openai':
          const openaiResponse = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: model || 'gpt-4-turbo-preview',
              messages: [{ role: 'user', content: articlePrompt }],
              temperature: generationOptions.temperature,
              max_tokens: generationOptions.maxTokens
            })
          }, 50000)

          if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json().catch(() => ({}))
            throw new Error(`OpenAI API request failed: ${errorData.error?.message || 'Unknown error'}`)
          }

          const openaiData = await openaiResponse.json()
          articleContent = openaiData.choices[0].message.content
          break

        case 'gemini':
          const geminiModel = model || 'gemini-2.5-flash-lite'
          const geminiResponse = await fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: articlePrompt }] }],
                generationConfig: {
                  temperature: generationOptions.temperature,
                  maxOutputTokens: generationOptions.maxTokens
                }
              })
            },
            50000
          )

          if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json().catch(() => ({}))
            throw new Error(`Gemini API request failed: ${errorData.error?.message || 'Unknown error'}`)
          }

          const geminiData = await geminiResponse.json()
          articleContent = geminiData.candidates[0].content.parts[0].text
          break

        case 'anthropic':
          const claudeResponse = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: model || 'claude-3-sonnet-20240229',
              max_tokens: generationOptions.maxTokens,
              temperature: generationOptions.temperature,
              messages: [{ role: 'user', content: articlePrompt }]
            })
          }, 50000)

          if (!claudeResponse.ok) {
            const errorData = await claudeResponse.json().catch(() => ({}))
            throw new Error(`Claude API request failed: ${errorData.error?.message || 'Unknown error'}`)
          }

          const claudeData = await claudeResponse.json()
          articleContent = claudeData.content[0].text
          break

        case 'openrouter':
          const openrouterResponse = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://medium-writer.vercel.app',
              'X-Title': 'Medium AI Writer'
            },
            body: JSON.stringify({
              model: model || 'openai/gpt-4-turbo-preview',
              messages: [{ role: 'user', content: articlePrompt }],
              temperature: generationOptions.temperature,
              max_tokens: generationOptions.maxTokens
            })
          }, 50000)

          if (!openrouterResponse.ok) {
            const errorData = await openrouterResponse.json().catch(() => ({}))
            throw new Error(`OpenRouter API request failed: ${errorData.error?.message || 'Unknown error'}`)
          }

          const openrouterData = await openrouterResponse.json()
          articleContent = openrouterData.choices[0].message.content
          break

        default:
          throw new Error(`Unsupported provider: ${provider}`)
      }

    } catch (providerError) {
      console.error('Article generation error:', providerError)
      generationError = providerError instanceof Error ? providerError.message : 'Unknown error'
      
      // Generate fallback content
      articleContent = `# ${input}

*This article was generated using a fallback template due to an API error.*

## Introduction

Based on your topic "${input}", here's a comprehensive article outline that you can expand upon:

## Main Content Areas

${category.primary === 'TECHNOLOGY' ? 
  '- Technical overview and implementation details\n- Best practices and common patterns\n- Real-world examples and use cases\n- Performance considerations\n- Future trends and developments' :
  category.primary === 'BUSINESS' ?
  '- Market analysis and opportunities\n- Strategic implementation approaches\n- Case studies and success stories\n- Risk assessment and mitigation\n- Key performance indicators' :
  category.primary === 'PERSONAL_DEVELOPMENT' ?
  '- Core principles and concepts\n- Practical implementation strategies\n- Common challenges and solutions\n- Success metrics and tracking\n- Long-term development planning' :
  category.primary === 'LIFESTYLE' ?
  '- Practical tips and recommendations\n- Benefits and positive outcomes\n- Getting started guide\n- Common mistakes to avoid\n- Sustainable practices for long-term success' :
  '- Current landscape and context\n- Key stakeholders and perspectives\n- Analysis of trends and implications\n- Potential solutions and approaches\n- Call to action for readers'
}

## Conclusion

This framework provides a solid foundation for exploring the topic of "${input}". Each section can be expanded with detailed research, examples, and personal insights to create a comprehensive and engaging article.

*Please note: This is a simplified version due to a temporary API issue. For a fully developed article, please try again or use a different AI provider.*`
    }

    // Validate and clean the content
    if (!articleContent || articleContent.trim().length === 0) {
      throw new Error('Generated article is empty')
    }

    // Calculate article metrics
    const wordCount = countWords(articleContent)
    const readingTime = calculateReadingTime(wordCount)
    const title = extractTitleFromContent(articleContent)
    const tags = generateTags(articleContent, category)

    // Create the article object
    const article: Article = {
      id: generateArticleId(),
      title,
      content: articleContent.trim(),
      category,
      metadata: {
        tags,
        description: `An AI-generated article about ${input} in the ${category.primary.toLowerCase().replace('_', ' ')} category.`,
        seoTitle: title,
        seoDescription: `Learn about ${input}. This comprehensive guide covers key insights, practical tips, and actionable strategies.`
      },
      generatedAt: new Date(),
      wordCount,
      readingTime
    }

    // Return the completed article
    const response = NextResponse.json(article)
    
    // Add generation metadata to response headers (useful for debugging)
    response.headers.set('X-Generation-Provider', provider)
    response.headers.set('X-Generation-Options', JSON.stringify(generationOptions))
    if (generationError) {
      response.headers.set('X-Generation-Warning', generationError)
    }

    return response

  } catch (error) {
    console.error('Article generation request error:', error)
    
    // Provide detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { 
        error: 'Failed to generate article',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}