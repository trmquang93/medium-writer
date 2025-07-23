import { NextRequest, NextResponse } from 'next/server'
import { AIProviderType, ContentCategory, CategoryType } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { input, provider, apiKey } = await request.json()

    if (!input || !provider || !apiKey) {
      return NextResponse.json(
        { error: 'Input, provider, and API key are required' },
        { status: 400 }
      )
    }

    const categoryPrompt = `
Analyze the following article idea and categorize it into one of these content categories:

1. TECHNOLOGY - AI, Programming, Data Science, Software Development, Tech Trends
2. PERSONAL_DEVELOPMENT - Self-improvement, Mental Health, Productivity, Habits
3. BUSINESS - Entrepreneurship, Finance, Startups, Management, Marketing
4. LIFESTYLE - Relationships, Health & Wellness, Travel, Food, Culture
5. CURRENT_AFFAIRS - Politics, Climate, Social Issues, News, Opinion
6. CREATIVE_WRITING - Fiction, Poetry, Storytelling, Literary Analysis, Creative Expression, Narrative Craft
7. EDUCATION_LEARNING - Teaching Methods, Learning Techniques, Educational Technology, Skill Development, Academic Success
8. ENTERTAINMENT_MEDIA - Movies, TV Shows, Music, Gaming, Pop Culture, Media Analysis, Celebrity Culture
9. SCIENCE_RESEARCH - Scientific Discoveries, Research Methodology, Academic Studies, Science Communication, Peer Review

Article idea: "${input}"

Respond with ONLY a JSON object in this exact format:
{
  "primary": "TECHNOLOGY",
  "secondary": "BUSINESS",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this categorization fits"
}

The confidence should be between 0.0 and 1.0. Secondary category is optional.
`

    let categoryAnalysis: ContentCategory

    try {
      switch (provider as AIProviderType) {
        case 'openai':
          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [{ role: 'user', content: categoryPrompt }],
              temperature: 0.3,
              max_tokens: 200
            })
          })

          if (!openaiResponse.ok) {
            throw new Error('OpenAI API request failed')
          }

          const openaiData = await openaiResponse.json()
          const openaiContent = openaiData.choices[0].message.content
          categoryAnalysis = JSON.parse(openaiContent)
          break

        case 'gemini':
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: categoryPrompt }] }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 200
                }
              })
            }
          )

          if (!geminiResponse.ok) {
            throw new Error('Gemini API request failed')
          }

          const geminiData = await geminiResponse.json()
          const geminiContent = geminiData.candidates[0].content.parts[0].text
          categoryAnalysis = JSON.parse(geminiContent)
          break

        case 'anthropic':
          const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 200,
              temperature: 0.3,
              messages: [{ role: 'user', content: categoryPrompt }]
            })
          })

          if (!claudeResponse.ok) {
            throw new Error('Claude API request failed')
          }

          const claudeData = await claudeResponse.json()
          const claudeContent = claudeData.content[0].text
          categoryAnalysis = JSON.parse(claudeContent)
          break

        default:
          // Fallback to basic keyword matching
          const lowerInput = input.toLowerCase()
          let primary: CategoryType = 'TECHNOLOGY'
          let confidence = 0.6

          if (lowerInput.includes('ai') || lowerInput.includes('programming') || lowerInput.includes('tech')) {
            primary = 'TECHNOLOGY'
          } else if (lowerInput.includes('business') || lowerInput.includes('startup')) {
            primary = 'BUSINESS'
          } else if (lowerInput.includes('health') || lowerInput.includes('lifestyle')) {
            primary = 'LIFESTYLE'
          } else if (lowerInput.includes('development') || lowerInput.includes('productivity')) {
            primary = 'PERSONAL_DEVELOPMENT'
          } else if (lowerInput.includes('fiction') || lowerInput.includes('writing') || lowerInput.includes('story') || lowerInput.includes('poetry') || lowerInput.includes('creative')) {
            primary = 'CREATIVE_WRITING'
          } else if (lowerInput.includes('politics') || lowerInput.includes('climate') || lowerInput.includes('current') || lowerInput.includes('affairs')) {
            primary = 'CURRENT_AFFAIRS'
          } else if (lowerInput.includes('education') || lowerInput.includes('learning') || lowerInput.includes('teaching') || lowerInput.includes('study') || lowerInput.includes('academic')) {
            primary = 'EDUCATION_LEARNING'
          } else if (lowerInput.includes('movie') || lowerInput.includes('music') || lowerInput.includes('game') || lowerInput.includes('entertainment') || lowerInput.includes('media') || lowerInput.includes('tv') || lowerInput.includes('celebrity')) {
            primary = 'ENTERTAINMENT_MEDIA'
          } else if (lowerInput.includes('science') || lowerInput.includes('research') || lowerInput.includes('study') || lowerInput.includes('scientific') || lowerInput.includes('academic')) {
            primary = 'SCIENCE_RESEARCH'
          }

          categoryAnalysis = {
            primary,
            confidence,
            reasoning: 'Categorized using keyword analysis'
          }
      }

      // Validate the response format
      if (!categoryAnalysis.primary || !categoryAnalysis.confidence) {
        throw new Error('Invalid category analysis format')
      }

      // Ensure confidence is within valid range
      categoryAnalysis.confidence = Math.max(0, Math.min(1, categoryAnalysis.confidence))

      return NextResponse.json(categoryAnalysis)

    } catch (parseError) {
      console.error('Category analysis error:', parseError)
      
      // Fallback categorization
      return NextResponse.json({
        primary: 'TECHNOLOGY' as CategoryType,
        confidence: 0.5,
        reasoning: 'Fallback categorization due to analysis error'
      })
    }

  } catch (error) {
    console.error('Category analysis request error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze category' },
      { status: 500 }
    )
  }
}