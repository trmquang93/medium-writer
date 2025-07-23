import { NextRequest, NextResponse } from 'next/server'
import { AIProviderType, ContentCategory, CategoryType } from '@/types'
import { AIProviderFactory } from '@/lib/ai-providers'

export async function POST(request: NextRequest) {
  try {
    const { input, provider, apiKey, model } = await request.json()

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

IMPORTANT: Respond with ONLY a valid JSON object. Do not include any explanatory text, markdown formatting, or code blocks. Return only the raw JSON:

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
      // Create AI provider instance using the factory
      const aiProvider = AIProviderFactory.createProvider({
        type: provider as AIProviderType,
        apiKey,
        model // Use the model from settings
      });
      
      // Determine the prefill based on provider capabilities
      const prefill = aiProvider.supportsPrefilling() ? '{' : undefined;
      
      console.log(`Using ${provider} provider with prefilling: ${!!prefill}`);
      
      // Use structured generation with prefilling
      const response = await aiProvider.generateStructuredContent<ContentCategory>({
        prompt: categoryPrompt,
        prefill,
        expectsJson: true,
        options: {
          wordCount: 500, // Short response
          tone: 'professional',
          format: 'how-to'
        },
        maxRetries: 2
      });

      console.log('Structured generation response:', {
        parsed: response.parsed,
        raw: response.raw.substring(0, 200) + '...',
        data: response.data
      });

      if (!response.parsed) {
        console.warn('Failed to parse structured response, attempting fallback');
        throw new Error('Failed to parse category analysis response');
      }

      categoryAnalysis = response.data;

      // Validate the response format
      if (!categoryAnalysis.primary || !categoryAnalysis.confidence) {
        throw new Error('Invalid category analysis format');
      }

      // Ensure confidence is within valid range
      categoryAnalysis.confidence = Math.max(0, Math.min(1, categoryAnalysis.confidence));

      return NextResponse.json(categoryAnalysis);

    } catch (structuredError) {
      console.warn('Structured generation failed, attempting legacy fallback:', structuredError);
      
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
        reasoning: 'Fallback categorization using keyword analysis due to structured generation failure'
      }
      
      return NextResponse.json(categoryAnalysis);
    }

  } catch (error) {
    console.error('Category analysis request error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze category' },
      { status: 500 }
    );
  }
}