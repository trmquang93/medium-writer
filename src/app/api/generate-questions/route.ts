import { NextRequest, NextResponse } from 'next/server'
import { AIProviderType, Question } from '@/types'
import { promptTemplates } from '@/lib/prompt-templates'

export async function POST(request: NextRequest) {
  try {
    const { input, category, provider, apiKey } = await request.json()

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

    // Generate the question prompt using the template system
    const questionPrompt = promptTemplates.buildQuestionGenerationPrompt(
      category.primary,
      input,
      5 // Maximum of 5 questions
    )

    let questions: Question[]

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
              messages: [{ role: 'user', content: questionPrompt }],
              temperature: 0.7,
              max_tokens: 800
            })
          })

          if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json().catch(() => ({}))
            throw new Error(`OpenAI API request failed: ${errorData.error?.message || 'Unknown error'}`)
          }

          const openaiData = await openaiResponse.json()
          const openaiContent = openaiData.choices[0].message.content
          questions = JSON.parse(openaiContent)
          break

        case 'gemini':
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: questionPrompt }] }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 800
                }
              })
            }
          )

          if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json().catch(() => ({}))
            throw new Error(`Gemini API request failed: ${errorData.error?.message || 'Unknown error'}`)
          }

          const geminiData = await geminiResponse.json()
          const geminiContent = geminiData.candidates[0].content.parts[0].text
          questions = JSON.parse(geminiContent)
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
              max_tokens: 800,
              temperature: 0.7,
              messages: [{ role: 'user', content: questionPrompt }]
            })
          })

          if (!claudeResponse.ok) {
            const errorData = await claudeResponse.json().catch(() => ({}))
            throw new Error(`Claude API request failed: ${errorData.error?.message || 'Unknown error'}`)
          }

          const claudeData = await claudeResponse.json()
          const claudeContent = claudeData.content[0].text
          questions = JSON.parse(claudeContent)
          break

        case 'openrouter':
          const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://medium-writer.vercel.app',
              'X-Title': 'Medium AI Writer'
            },
            body: JSON.stringify({
              model: 'openai/gpt-3.5-turbo',
              messages: [{ role: 'user', content: questionPrompt }],
              temperature: 0.7,
              max_tokens: 800
            })
          })

          if (!openrouterResponse.ok) {
            const errorData = await openrouterResponse.json().catch(() => ({}))
            throw new Error(`OpenRouter API request failed: ${errorData.error?.message || 'Unknown error'}`)
          }

          const openrouterData = await openrouterResponse.json()
          const openrouterContent = openrouterData.choices[0].message.content
          questions = JSON.parse(openrouterContent)
          break

        default:
          // Fallback to template-based questions when provider is not supported
          const categoryPrompt = promptTemplates.getCategoryPrompt(category.primary)
          questions = categoryPrompt.questionTemplates.slice(0, 5).map((template) => ({
            id: template.id,
            text: template.question,
            type: template.type as 'text' | 'select' | 'multiselect' | 'number',
            required: template.required,
            options: template.options,
            placeholder: template.placeholder,
            category: category.primary
          }))
      }

      // Validate and clean the questions response
      if (!Array.isArray(questions)) {
        throw new Error('Invalid questions format - expected array')
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
        .slice(0, 5) // Ensure maximum of 5 questions

      // Ensure we have at least one question
      if (validatedQuestions.length === 0) {
        throw new Error('No valid questions generated')
      }

      return NextResponse.json(validatedQuestions)

    } catch (parseError) {
      console.error('Question generation error:', parseError)
      
      // Fallback to template-based questions
      const categoryPrompt = promptTemplates.getCategoryPrompt(category.primary)
      const fallbackQuestions: Question[] = categoryPrompt.questionTemplates.slice(0, 3).map(template => ({
        id: template.id,
        text: template.question,
        type: template.type as 'text' | 'select' | 'multiselect' | 'number',
        required: template.required,
        options: template.options,
        placeholder: template.placeholder,
        category: category.primary
      }))

      return NextResponse.json(fallbackQuestions)
    }

  } catch (error) {
    console.error('Question generation request error:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}