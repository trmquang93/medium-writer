// Test data fixtures for component testing

export const mockUserInputs = {
  valid: "I want to write about artificial intelligence and how it's transforming the healthcare industry.",
  short: "AI",
  empty: "",
  long: "A".repeat(5000),
}

export const mockCategories = {
  technology: {
    primary: 'technology',
    confidence: 0.92,
    reasoning: 'Content focuses on AI and technology applications in healthcare.'
  },
  business: {
    primary: 'business',
    confidence: 0.78,
    reasoning: 'Content discusses business transformation and industry impact.'
  },
  lowConfidence: {
    primary: 'lifestyle',
    confidence: 0.45,
    reasoning: 'Content category is unclear.'
  }
}

export const mockQuestions = [
  {
    id: 'tech_1',
    text: 'What specific AI technology are you focusing on?',
    type: 'text',
    required: true,
    category: 'technology'
  },
  {
    id: 'tech_2', 
    text: 'Which healthcare applications interest you most?',
    type: 'multiselect',
    required: true,
    options: ['Diagnostics', 'Treatment Planning', 'Drug Discovery', 'Patient Care'],
    category: 'technology'
  },
  {
    id: 'tech_3',
    text: 'What is your target audience?',
    type: 'select',
    required: false,
    options: ['Healthcare Professionals', 'Tech Enthusiasts', 'General Public', 'Researchers'],
    category: 'technology'
  }
]

export const mockResponses = {
  tech_1: 'Machine learning and deep learning algorithms',
  tech_2: ['Diagnostics', 'Treatment Planning'],
  tech_3: 'Healthcare Professionals'
}

export const mockGeneratedArticle = {
  title: 'AI Revolution in Healthcare: Transforming Patient Care Through Machine Learning',
  content: `# AI Revolution in Healthcare: Transforming Patient Care Through Machine Learning

## Introduction

Artificial intelligence is revolutionizing healthcare by providing unprecedented capabilities in diagnostics and treatment planning. Machine learning algorithms are now able to analyze medical images with accuracy that rivals human specialists.

## Key Applications

### Medical Diagnostics
AI systems can process thousands of medical images in seconds, identifying patterns that might be missed by human eyes.

### Treatment Planning  
Machine learning helps doctors create personalized treatment plans based on patient data and historical outcomes.

## Conclusion

The future of healthcare lies in the seamless integration of AI technologies that augment human expertise rather than replace it.`,
  metadata: {
    wordCount: 156,
    readingTime: 1,
    category: 'technology'
  }
}

export const mockApiResponses = {
  categoryAnalysis: {
    success: {
      category: 'technology',
      confidence: 0.85,
      reasoning: 'Content discusses AI and healthcare technology.'
    },
    error: {
      error: 'Failed to analyze category',
      message: 'API key is invalid or service unavailable'
    }
  },
  
  questionGeneration: {
    success: mockQuestions,
    error: {
      error: 'Failed to generate questions',
      message: 'Unable to connect to AI service'
    }
  },
  
  articleGeneration: {
    success: mockGeneratedArticle,
    error: {
      error: 'Failed to generate article', 
      message: 'Content generation service is currently unavailable'
    }
  }
}

export const mockExportFormats = {
  markdown: '# Test Article\n\nThis is test content.',
  html: '<h1>Test Article</h1>\n<p>This is test content.</p>',
  plainText: 'Test Article\n\nThis is test content.',
  filename: 'ai-revolution-in-healthcare-2024-07-23.md'
}