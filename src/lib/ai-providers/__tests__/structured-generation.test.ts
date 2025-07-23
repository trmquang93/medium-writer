import { BaseAIProvider, StructuredGenerationRequest, StructuredGenerationResponse } from '../base-provider';
import { ClaudeProvider } from '../claude-provider';
import { OpenAIProvider } from '../openai-provider';
import { GeminiProvider } from '../gemini-provider';
import { OpenRouterProvider } from '../openrouter-provider';

// Mock implementation for testing
class MockAIProvider extends BaseAIProvider {
  private mockResponse: string;

  constructor(mockResponse: string) {
    super('openai', 'test-key');
    this.mockResponse = mockResponse;
  }

  getDefaultModel() { return 'test-model'; }
  getDefaultBaseURL() { return 'https://test.com'; }
  getAvailableModels() { return []; }
  
  async validateApiKey() { return true; }
  async getUsageMetrics() { return {} as any; }
  
  async generateContent() {
    return {
      content: this.mockResponse,
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
    };
  }

  async *generateContentStream() {
    yield { content: this.mockResponse, isComplete: true };
  }
}

describe('Structured Generation System', () => {
  describe('JSON Response Cleaning', () => {
    let provider: MockAIProvider;

    beforeEach(() => {
      provider = new MockAIProvider('');
    });

    test('cleanJsonResponse removes markdown code blocks', () => {
      const input = '```json\\n{"test": "value"}\\n```';
      const result = (provider as any).cleanJsonResponse(input);
      expect(result).toBe('{"test": "value"}');
    });

    test('cleanJsonResponse extracts JSON from mixed content', () => {
      const input = 'Here is the JSON: {"test": "value"} Hope this helps!';
      const result = (provider as any).cleanJsonResponse(input);
      expect(result).toBe('{"test": "value"}');
    });

    test('cleanJsonResponse handles array responses', () => {
      const input = 'The response is: [{"id": 1}, {"id": 2}]';
      const result = (provider as any).cleanJsonResponse(input);
      expect(result).toBe('[{"id": 1}, {"id": 2}]');
    });

    test('aggressiveJsonCleaning removes common prefixes', () => {
      const input = 'Here is the JSON: {"test": "value"}';
      const result = (provider as any).aggressiveJsonCleaning(input);
      expect(result).toBe('{"test": "value"}');
    });

    test('aggressiveJsonCleaning handles complex mixed content', () => {
      const input = 'Analysis: Based on the input, here\\'s the result: {"category": "TECHNOLOGY", "confidence": 0.9} This categorization is based on...';
      const result = (provider as any).aggressiveJsonCleaning(input);
      expect(result).toBe('{"category": "TECHNOLOGY", "confidence": 0.9}');
    });
  });

  describe('Structured Generation', () => {
    test('generateStructuredContent with valid JSON', async () => {
      const mockProvider = new MockAIProvider('{"test": "success"}');
      
      const request: StructuredGenerationRequest = {
        prompt: 'Generate test data',
        expectsJson: true,
        options: { wordCount: 100, tone: 'professional', format: 'how-to' }
      };

      const result = await mockProvider.generateStructuredContent(request);

      expect(result.parsed).toBe(true);
      expect(result.data).toEqual({ test: 'success' });
      expect(result.raw).toBe('{"test": "success"}');
    });

    test('generateStructuredContent with markdown-wrapped JSON', async () => {
      const mockProvider = new MockAIProvider('```json\\n{"category": "TECHNOLOGY"}\\n```');
      
      const request: StructuredGenerationRequest = {
        prompt: 'Categorize this',
        expectsJson: true,
        options: { wordCount: 100, tone: 'professional', format: 'how-to' }
      };

      const result = await mockProvider.generateStructuredContent(request);

      expect(result.parsed).toBe(true);
      expect(result.data).toEqual({ category: 'TECHNOLOGY' });
    });

    test('generateStructuredContent with non-JSON expectsJson false', async () => {
      const mockProvider = new MockAIProvider('This is plain text response');
      
      const request: StructuredGenerationRequest = {
        prompt: 'Generate text',
        expectsJson: false,
        options: { wordCount: 100, tone: 'professional', format: 'how-to' }
      };

      const result = await mockProvider.generateStructuredContent(request);

      expect(result.parsed).toBe(true);
      expect(result.data).toBe('This is plain text response');
    });

    test('generateStructuredContent with retry on failure', async () => {
      let attemptCount = 0;
      const mockProvider = new (class extends MockAIProvider {
        async generateContent() {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error('First attempt fails');
          }
          return {
            content: '{"success": true}',
            usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
          };
        }
      })('');

      const request: StructuredGenerationRequest = {
        prompt: 'Generate data',
        expectsJson: true,
        maxRetries: 2,
        options: { wordCount: 100, tone: 'professional', format: 'how-to' }
      };

      const result = await mockProvider.generateStructuredContent(request);

      expect(attemptCount).toBe(2);
      expect(result.parsed).toBe(true);
      expect(result.data).toEqual({ success: true });
    });
  });

  describe('Provider-Specific Prefilling', () => {
    test('Claude provider supports prefilling', () => {
      const claude = new ClaudeProvider('test-key');
      expect(claude.supportsPrefilling()).toBe(true);
    });

    test('OpenAI provider does not support native prefilling', () => {
      const openai = new OpenAIProvider('test-key');
      expect(openai.supportsPrefilling()).toBe(false);
    });

    test('Gemini provider does not support native prefilling', () => {
      const gemini = new GeminiProvider('test-key');
      expect(gemini.supportsPrefilling()).toBe(false);
    });

    test('OpenRouter provider does not support native prefilling', () => {
      const openrouter = new OpenRouterProvider('test-key');
      expect(openrouter.supportsPrefilling()).toBe(false);
    });
  });

  describe('Provider Info Enhancement', () => {
    test('getInfo includes prefilling support information', () => {
      const claude = new ClaudeProvider('test-key');
      const info = claude.getInfo();
      
      expect(info.supportsPrefilling).toBe(true);
      expect(info.type).toBe('anthropic');
    });
  });

  describe('Edge Cases', () => {
    test('handles malformed JSON gracefully', async () => {
      const mockProvider = new MockAIProvider('{"invalid": json}');
      
      const request: StructuredGenerationRequest = {
        prompt: 'Generate data',
        expectsJson: true,
        maxRetries: 1,
        options: { wordCount: 100, tone: 'professional', format: 'how-to' }
      };

      await expect(mockProvider.generateStructuredContent(request))
        .rejects.toThrow('Failed to parse JSON response');
    });

    test('handles empty responses', async () => {
      const mockProvider = new MockAIProvider('');
      
      const request: StructuredGenerationRequest = {
        prompt: 'Generate data',
        expectsJson: true,
        maxRetries: 1,
        options: { wordCount: 100, tone: 'professional', format: 'how-to' }
      };

      await expect(mockProvider.generateStructuredContent(request))
        .rejects.toThrow();
    });

    test('handles responses with no JSON content', async () => {
      const mockProvider = new MockAIProvider('This response contains no JSON at all');
      
      const request: StructuredGenerationRequest = {
        prompt: 'Generate data',
        expectsJson: true,
        maxRetries: 1,
        options: { wordCount: 100, tone: 'professional', format: 'how-to' }
      };

      await expect(mockProvider.generateStructuredContent(request))
        .rejects.toThrow();
    });
  });

  describe('Real-world JSON Patterns', () => {
    const testCases = [
      {
        name: 'Gemini typical response',
        input: '```json\\n{\\n  "primary": "TECHNOLOGY",\\n  "confidence": 0.85,\\n  "reasoning": "This appears to be about AI"\\n}\\n```',
        expected: { primary: 'TECHNOLOGY', confidence: 0.85, reasoning: 'This appears to be about AI' }
      },
      {
        name: 'Claude with explanation',
        input: 'Based on the content, here\\'s my analysis:\\n\\n{"primary": "BUSINESS", "secondary": "TECHNOLOGY", "confidence": 0.9, "reasoning": "Discusses business applications of tech"}\\n\\nThis categorization reflects...',
        expected: { primary: 'BUSINESS', secondary: 'TECHNOLOGY', confidence: 0.9, reasoning: 'Discusses business applications of tech' }
      },
      {
        name: 'OpenAI clean response',
        input: '{"category": "LIFESTYLE", "tags": ["health", "wellness"], "confidence": 0.75}',
        expected: { category: 'LIFESTYLE', tags: ['health', 'wellness'], confidence: 0.75 }
      },
      {
        name: 'Question array response',
        input: '[{"id": "q1", "text": "What is your main goal?", "type": "text"}, {"id": "q2", "text": "How do you measure success?", "type": "text"}]',
        expected: [
          { id: 'q1', text: 'What is your main goal?', type: 'text' },
          { id: 'q2', text: 'How do you measure success?', type: 'text' }
        ]
      }
    ];

    testCases.forEach(({ name, input, expected }) => {
      test(`handles ${name}`, async () => {
        const mockProvider = new MockAIProvider(input);
        
        const request: StructuredGenerationRequest = {
          prompt: 'Test prompt',
          expectsJson: true,
          options: { wordCount: 100, tone: 'professional', format: 'how-to' }
        };

        const result = await mockProvider.generateStructuredContent(request);

        expect(result.parsed).toBe(true);
        expect(result.data).toEqual(expected);
      });
    });
  });
});

describe('Integration Tests', () => {
  // These would require actual API keys and should be run separately
  describe.skip('Live API Tests', () => {
    test('Claude prefilling with real API', async () => {
      // Would test actual Claude API with prefilling
    });

    test('OpenAI system message approach', async () => {
      // Would test OpenAI with system messages
    });

    test('Gemini enhanced prompting', async () => {
      // Would test Gemini with improved prompts
    });
  });
});