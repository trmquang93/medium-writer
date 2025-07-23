import { NextRequest, NextResponse } from 'next/server'
import { AIProviderType, ContentCategory, CategoryType } from '@/types'
import { AIProviderFactory } from '@/lib/ai-providers'

interface CategoryAnalysisRequest {
  input: string;
  provider: AIProviderType;
  apiKey: string;
}

interface CategoryAnalysisResponse {
  primary: CategoryType;
  secondary?: CategoryType;
  confidence: number;
  reasoning: string;
}

export async function POST(request: NextRequest) {
  try {
    const { input, provider, apiKey }: CategoryAnalysisRequest = await request.json()

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

Provide your analysis as a JSON object with the following structure:
{
  "primary": "TECHNOLOGY",
  "secondary": "BUSINESS",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this categorization fits"
}

The confidence should be between 0.0 and 1.0. Secondary category is optional.`

    try {
      // Create AI provider instance
      const aiProvider = AIProviderFactory.createProvider(provider, apiKey);
      
      // Determine the prefill based on provider capabilities
      const prefill = aiProvider.supportsPrefilling() ? '{' : undefined;
      
      // Use structured generation
      const response = await aiProvider.generateStructuredContent<CategoryAnalysisResponse>({
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

      if (!response.parsed) {
        console.warn('Failed to parse structured response, using fallback');
        throw new Error('Failed to parse category analysis response');
      }

      const categoryAnalysis = response.data;

      // Validate the response format
      if (!categoryAnalysis.primary || !categoryAnalysis.confidence) {
        throw new Error('Invalid category analysis format');
      }

      // Ensure confidence is within valid range
      categoryAnalysis.confidence = Math.max(0, Math.min(1, categoryAnalysis.confidence));

      return NextResponse.json(categoryAnalysis);

    } catch (providerError) {
      console.error('Category analysis error:', providerError);
      console.error('Error details:', {
        message: providerError instanceof Error ? providerError.message : 'Unknown error',
        provider,
        input: input.substring(0, 100) + '...' // Log first 100 chars of input for debugging
      });
      
      // Fallback categorization with more specific error information
      const errorMessage = providerError instanceof Error ? providerError.message : 'Unknown error';
      return NextResponse.json({
        primary: 'TECHNOLOGY' as CategoryType,
        confidence: 0.5,
        reasoning: `Fallback categorization due to ${provider} analysis error: ${errorMessage.substring(0, 100)}`
      });
    }

  } catch (error) {
    console.error('Category analysis request error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze category' },
      { status: 500 }
    );
  }
}