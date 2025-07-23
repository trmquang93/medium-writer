describe('Debug Import', () => {
  it('should debug component import', async () => {
    console.log('Before mocks')
    
    // Mock all dependencies first
    jest.doMock('@/store/workflowStore', () => ({
      useWorkflowStore: () => ({
        userInput: '',
        setUserInput: jest.fn(),
        setCurrentStep: jest.fn(),
        setError: jest.fn(),
      }),
    }))

    jest.doMock('@/hooks/useAIProvider', () => ({
      useAIProvider: () => ({
        isConfigured: true,
      }),
    }))

    jest.doMock('@/lib/utils', () => ({
      cn: jest.fn(),
    }))

    jest.doMock('framer-motion', () => ({
      motion: {
        div: 'div',
        button: 'button', 
        textarea: 'textarea',
      },
      AnimatePresence: ({ children }: any) => children,
    }))

    jest.doMock('@/components/ui/ApiKeySetup', () => ({
      ApiKeySetup: () => 'api-key-setup',
    }))

    jest.doMock('@/components/ui/Button', () => ({
      Button: 'button',
    }))

    jest.doMock('@/components/ui/Textarea', () => ({
      Textarea: 'textarea',
    }))

    jest.doMock('lucide-react', () => ({
      ArrowRight: () => 'arrow',
      Lightbulb: () => 'lightbulb',
      PenTool: () => 'pen',
      Sparkles: () => 'sparkles',
    }))

    console.log('After mocks, before import')
    
    try {
      const module = await import('@/components/workflow/InputStep')
      console.log('Module imported:', module)
      console.log('InputStep:', module.InputStep)
      console.log('typeof InputStep:', typeof module.InputStep)
      
      expect(module.InputStep).toBeDefined()
      expect(typeof module.InputStep).toBe('function')
    } catch (error) {
      console.error('Import failed:', error)
      throw error
    }
  })
})