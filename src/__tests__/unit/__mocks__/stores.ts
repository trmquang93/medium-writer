// Mock utilities for Jest testing

// Mock Workflow Store
export const mockWorkflowStore = {
  // State
  currentStep: 'input',
  userInput: '',
  selectedCategory: null,
  questions: [],
  responses: {},
  generatedArticle: null,
  error: null,
  isLoading: false,

  // Actions
  setCurrentStep: jest.fn(),
  setUserInput: jest.fn(),
  setSelectedCategory: jest.fn(),
  setQuestions: jest.fn(),
  addResponse: jest.fn(),
  setGeneratedArticle: jest.fn(),
  updateGeneratedArticle: jest.fn(),
  setError: jest.fn(),
  setLoading: jest.fn(),
  resetWorkflow: jest.fn(),
  
  // Navigation helpers
  goToStep: jest.fn(),
  goToNextStep: jest.fn(),
  goToPreviousStep: jest.fn(),
}

// Mock Settings Store
export const mockSettingsStore = {
  // State
  selectedProvider: 'openai',
  apiKeys: {},
  
  // Actions
  setSelectedProvider: jest.fn(),
  setApiKey: jest.fn(),
  clearApiKey: jest.fn(),
  clearAllApiKeys: jest.fn(),
}

// Mock AI Provider Hook
export const mockAIProvider = {
  // State
  isConfigured: true,
  currentProvider: 'openai',
  isValidating: false,
  
  // Methods
  validateApiKey: jest.fn().mockResolvedValue(true),
  analyzeCategory: jest.fn().mockResolvedValue({
    category: 'technology',
    confidence: 0.85,
    reasoning: 'This appears to be about technology based on keywords.'
  }),
  generateQuestions: jest.fn().mockResolvedValue([
    { id: '1', text: 'What is the main topic?', type: 'text', required: true }
  ]),
  generateArticle: jest.fn().mockResolvedValue({
    title: 'Test Article',
    content: 'This is a test article content.',
    metadata: { wordCount: 100, readingTime: 1 }
  }),
  optimizeContent: jest.fn().mockResolvedValue('Optimized content'),
}

// Helper to reset all mocks
export const resetMocks = () => {
  Object.values(mockWorkflowStore).forEach(fn => {
    if (typeof fn === 'function') fn.mockClear()
  })
  Object.values(mockSettingsStore).forEach(fn => {
    if (typeof fn === 'function') fn.mockClear()
  })
  Object.values(mockAIProvider).forEach(fn => {
    if (typeof fn === 'function') fn.mockClear()
  })
}