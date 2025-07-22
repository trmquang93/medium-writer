import { NextRequest, NextResponse } from 'next/server'
import { AIProviderType } from '@/types'
import { validateApiKey } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { provider, key } = await request.json()

    if (!provider || !key) {
      return NextResponse.json(
        { valid: false, error: 'Provider and key are required' },
        { status: 400 }
      )
    }

    // Basic format validation
    if (!validateApiKey(provider, key)) {
      return NextResponse.json(
        { valid: false, error: 'Invalid API key format' },
        { status: 400 }
      )
    }

    // Test the actual API key with a simple request
    let isValid = false
    
    try {
      switch (provider as AIProviderType) {
        case 'openai':
          const openaiResponse = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json'
            }
          })
          isValid = openaiResponse.ok
          break

        case 'gemini':
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
          )
          isValid = geminiResponse.ok
          break

        case 'anthropic':
          const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 1,
              messages: [{ role: 'user', content: 'test' }]
            })
          })
          // Claude returns 400 for too short max_tokens, but that means auth worked
          isValid = claudeResponse.status === 400 || claudeResponse.ok
          break

        case 'openrouter':
          const openrouterResponse = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json'
            }
          })
          isValid = openrouterResponse.ok
          break

        default:
          return NextResponse.json(
            { valid: false, error: 'Unknown provider' },
            { status: 400 }
          )
      }
    } catch (error) {
      console.error('API validation error:', error)
      return NextResponse.json(
        { valid: false, error: 'Failed to validate API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      valid: isValid,
      provider,
      ...(isValid ? {} : { error: 'API key is not valid or has insufficient permissions' })
    })

  } catch (error) {
    console.error('Validation request error:', error)
    return NextResponse.json(
      { valid: false, error: 'Invalid request format' },
      { status: 500 }
    )
  }
}