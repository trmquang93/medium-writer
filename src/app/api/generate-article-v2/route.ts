import { NextRequest, NextResponse } from 'next/server'
import { AIProviderType, ContentCategory, Article, Response, GenerationOptions } from '@/types'
import { promptTemplates } from '@/lib/prompt-templates'
import { AIProviderFactory } from '@/lib/ai-providers'

interface ArticleMetadata {
  title: string;
  wordCount: number;
  readingTime: number;
  tags: string[];
  description: string;
  keywords: string[];
}

interface EnhancedArticle extends Article {
  metadata: ArticleMetadata;
  seoOptimized: boolean;
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

    // Prepare responses array
    let articleResponses: Response[] = []
    if (responses) {
      if (Array.isArray(responses)) {
        articleResponses = responses
      } else {
        articleResponses = Object.entries(responses).map(([questionId, answer]) => ({
          questionId,
          question: questionId,
          answer: String(answer),
          timestamp: new Date()
        }))
      }
    }

    // Generate the article prompt
    const articlePrompt = promptTemplates.buildArticlePrompt(
      category.primary,
      input,
      articleResponses,
      generationOptions
    )

    let articleContent: string = ''
    let generationError: string | null = null

    try {
      // Create AI provider instance
      const aiProvider = AIProviderFactory.createProvider(provider, apiKey, model);
      
      console.log(`Using ${provider} provider for article generation`);
      
      // Generate the main article content
      const articleResponse = await aiProvider.generateContent({
        prompt: articlePrompt,
        options: generationOptions
      });

      articleContent = articleResponse.content;

      // Generate structured metadata using prefilling
      const metadataPrompt = `
Based on the following article content, generate SEO-optimized metadata:

Article Content:
${articleContent}

Category: ${category.primary}
${category.secondary ? `Secondary Category: ${category.secondary}` : ''}

Generate comprehensive metadata for this article:`;

      const prefill = aiProvider.supportsPrefilling() ? '{\n  "title": "' : undefined;
      
      const metadataResponse = await aiProvider.generateStructuredContent<ArticleMetadata>({
        prompt: metadataPrompt,
        prefill,
        expectsJson: true,
        options: {
          wordCount: 300,
          tone: 'professional',
          format: 'how-to'
        },
        maxRetries: 2
      });

      let metadata: ArticleMetadata;
      
      if (metadataResponse.parsed && metadataResponse.data) {
        metadata = metadataResponse.data;
        console.log('Successfully generated structured metadata:', metadata);
      } else {
        console.warn('Failed to generate structured metadata, using fallback');
        // Fallback metadata extraction
        const wordCount = countWords(articleContent);
        metadata = {
          title: extractTitleFromContent(articleContent),
          wordCount,
          readingTime: calculateReadingTime(wordCount),
          tags: generateFallbackTags(category),
          description: generateFallbackDescription(articleContent),
          keywords: extractKeywords(articleContent, category)
        };
      }

      // Ensure metadata has all required fields
      const finalMetadata: ArticleMetadata = {
        title: metadata.title || extractTitleFromContent(articleContent),
        wordCount: metadata.wordCount || countWords(articleContent),
        readingTime: metadata.readingTime || calculateReadingTime(countWords(articleContent)),
        tags: Array.isArray(metadata.tags) ? metadata.tags.slice(0, 5) : generateFallbackTags(category),
        description: metadata.description || generateFallbackDescription(articleContent),
        keywords: Array.isArray(metadata.keywords) ? metadata.keywords.slice(0, 10) : extractKeywords(articleContent, category)
      };

      // Create enhanced article object
      const enhancedArticle: EnhancedArticle = {
        id: generateArticleId(),
        title: finalMetadata.title,
        content: articleContent,
        category: category,
        generatedAt: new Date(),
        modifiedAt: new Date(),
        metadata: finalMetadata,
        seoOptimized: metadataResponse.parsed // true if we successfully generated structured metadata
      };

      return NextResponse.json(enhancedArticle);

    } catch (providerError) {
      console.error('Article generation error:', providerError);
      generationError = providerError instanceof Error ? providerError.message : 'Unknown error';
      
      // Fallback article generation
      const fallbackContent = generateFallbackContent(input, category, articleResponses);
      const wordCount = countWords(fallbackContent);
      
      const fallbackArticle: EnhancedArticle = {
        id: generateArticleId(),
        title: `Article about ${input}`,
        content: fallbackContent,
        category: category,
        generatedAt: new Date(),
        modifiedAt: new Date(),
        metadata: {
          title: `Article about ${input}`,
          wordCount,
          readingTime: calculateReadingTime(wordCount),
          tags: generateFallbackTags(category),
          description: `An article about ${input} in the ${category.primary.toLowerCase()} category.`,
          keywords: [input, category.primary.toLowerCase()]
        },
        seoOptimized: false
      };

      return NextResponse.json(fallbackArticle);
    }

  } catch (error) {
    console.error('Article generation request error:', error);
    return NextResponse.json(
      { error: 'Failed to generate article' },
      { status: 500 }
    );
  }
}

// Helper functions for fallback metadata generation
function generateFallbackTags(category: ContentCategory): string[] {
  const categoryTags: Record<string, string[]> = {
    'TECHNOLOGY': ['Technology', 'Programming', 'AI', 'Development'],
    'PERSONAL_DEVELOPMENT': ['Personal Development', 'Self Improvement', 'Productivity'],
    'BUSINESS': ['Business', 'Entrepreneurship', 'Strategy', 'Leadership'],
    'LIFESTYLE': ['Lifestyle', 'Health', 'Wellness', 'Life'],
    'CURRENT_AFFAIRS': ['Current Affairs', 'Politics', 'Society', 'Opinion'],
    'CREATIVE_WRITING': ['Creative Writing', 'Fiction', 'Storytelling', 'Literature'],
    'EDUCATION_LEARNING': ['Education', 'Learning', 'Teaching', 'Academic'],
    'ENTERTAINMENT_MEDIA': ['Entertainment', 'Media', 'Culture', 'Review'],
    'SCIENCE_RESEARCH': ['Science', 'Research', 'Academic', 'Study']
  }
  
  const baseTags = categoryTags[category.primary] || []
  
  if (category.secondary) {
    baseTags.push(...(categoryTags[category.secondary] || []))
  }
  
  return Array.from(new Set(baseTags)).slice(0, 5)
}

function generateFallbackDescription(content: string): string {
  // Extract first paragraph or first 150 characters
  const firstParagraph = content.split('\n').find(line => line.trim().length > 50);
  if (firstParagraph) {
    return firstParagraph.trim().substring(0, 150) + '...';
  }
  return content.substring(0, 150) + '...';
}

function extractKeywords(content: string, category: ContentCategory): string[] {
  // Simple keyword extraction based on word frequency
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 4)
    .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'these', 'those', 'will', 'can', 'could', 'should', 'would', 'have', 'has', 'had', 'been', 'being', 'there', 'their', 'they', 'them', 'when', 'where', 'what', 'which', 'who', 'how'].includes(word));

  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Get top words by frequency
  const topWords = Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8)
    .map(([word]) => word);

  // Add category-related keywords
  const categoryKeywords = [category.primary.toLowerCase().replace('_', ' ')];
  if (category.secondary) {
    categoryKeywords.push(category.secondary.toLowerCase().replace('_', ' '));
  }

  return [...categoryKeywords, ...topWords].slice(0, 10);
}

function generateFallbackContent(input: string, category: ContentCategory, responses: Response[]): string {
  const responseText = responses.length > 0 
    ? responses.map(r => `**${r.question}:** ${r.answer}`).join('\n\n')
    : '';

  return `# ${input}

*Please note: This is a simplified version due to a temporary API issue. For a fully developed article, please try again or use a different AI provider.*

## Introduction

This article explores the topic of "${input}" within the ${category.primary.toLowerCase().replace('_', ' ')} category.

${responseText}

## Conclusion

This article provides an overview of ${input}. For a more comprehensive analysis, please regenerate the article when the AI service is available.

---

*Generated on ${new Date().toLocaleDateString()}*`;
}