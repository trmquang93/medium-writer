import { NextRequest, NextResponse } from 'next/server';
import { AIProviderType, Question } from '@/types';
import { promptTemplates } from '@/lib/prompt-templates';
import { AIProviderFactory } from '@/lib/ai-providers';

export async function POST(request: NextRequest) {
  try {
    const { input, category, provider, apiKey } = await request.json();

    // Validate required parameters
    if (!input || !category || !provider || !apiKey) {
      return NextResponse.json(
        { error: 'Input, category, provider, and API key are required' },
        { status: 400 }
      );
    }

    // Validate category structure
    if (!category.primary) {
      return NextResponse.json(
        { error: 'Category must have a primary classification' },
        { status: 400 }
      );
    }

    // Generate the question prompt using the template system
    const questionPrompt = promptTemplates.buildQuestionGenerationPrompt(
      category.primary,
      input,
      5 // Maximum of 5 questions
    );

    let questions: Question[];

    try {
      // Create AI provider instance using the factory
      const aiProvider = AIProviderFactory.createProvider(provider, apiKey);
      
      // Determine the prefill based on provider capabilities (for JSON array)
      const prefill = aiProvider.supportsPrefilling() ? '[' : undefined;
      
      console.log(`Using ${provider} provider for question generation with prefilling: ${!!prefill}`);
      
      // Use structured generation with prefilling
      const response = await aiProvider.generateStructuredContent<Question[]>({
        prompt: questionPrompt,
        prefill,
        expectsJson: true,
        options: {
          wordCount: 800, // Medium response for questions
          tone: 'conversational',
          format: 'how-to'
        },
        maxRetries: 2
      });

      console.log('Question generation response:', {
        parsed: response.parsed,
        questionsCount: Array.isArray(response.data) ? response.data.length : 'not-array',
        raw: response.raw.substring(0, 200) + '...'
      });

      if (!response.parsed || !Array.isArray(response.data)) {
        console.warn('Failed to parse structured response, attempting fallback');
        throw new Error('Failed to parse question generation response');
      }

      questions = response.data;

      // Validate and clean the questions response
      if (!Array.isArray(questions)) {
        throw new Error('Invalid questions format - expected array');
      }

      // Ensure all questions have required fields and proper formatting
      const validatedQuestions: Question[] = questions
        .filter(q => q && typeof q === 'object')
        .map((q, index) => ({
          id: q.id || `question_${index + 1}`,
          text: q.text || (q as any).question || 'Question not specified',
          type: (['text', 'select', 'multiselect', 'number'].includes(q.type)) ? q.type : 'text',
          required: Boolean(q.required),
          options: Array.isArray(q.options) ? q.options : undefined,
          placeholder: typeof q.placeholder === 'string' ? q.placeholder : undefined,
          category: category.primary
        }))
        .slice(0, 5); // Ensure maximum of 5 questions

      // Ensure we have at least one question
      if (validatedQuestions.length === 0) {
        throw new Error('No valid questions generated');
      }

      return NextResponse.json(validatedQuestions);

    } catch (structuredError) {
      console.warn('Structured generation failed, attempting template fallback:', structuredError);
      
      // Fallback to template-based questions
      const categoryPrompt = promptTemplates.getCategoryPrompt(category.primary);
      questions = categoryPrompt.questionTemplates.slice(0, 5).map((template) => ({
        id: template.id,
        text: template.question,
        type: template.type as 'text' | 'select' | 'multiselect' | 'number',
        required: template.required,
        options: template.options,
        placeholder: template.placeholder,
        category: category.primary
      }));
      
      return NextResponse.json(questions);
    }

  } catch (error) {
    console.error('Question generation request error:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
}