import React from 'react'
import { render, screen } from '@testing-library/react'

// Create minimal mocks
const mockUseWorkflowStore = jest.fn(() => ({
  userInput: '',
  setUserInput: jest.fn(),
  setCurrentStep: jest.fn(),
  setError: jest.fn(),
}))

const mockUseAIProvider = jest.fn(() => ({
  isConfigured: true,
}))

// Mock all dependencies before importing the component
jest.mock('@/store/workflowStore', () => ({
  useWorkflowStore: mockUseWorkflowStore,
}))

jest.mock('@/hooks/useAIProvider', () => ({
  useAIProvider: mockUseAIProvider,
}))

jest.mock('@/lib/utils', () => ({
  cn: jest.fn((...args) => args.filter(Boolean).join(' ')),
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    textarea: 'textarea',
  },
  AnimatePresence: ({ children }: any) => children,
}))

jest.mock('@/components/ui/ApiKeySetup', () => ({
  ApiKeySetup: () => <div data-testid="api-key-setup">API Key Setup</div>,
}))

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

jest.mock('@/components/ui/Textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}))

jest.mock('lucide-react', () => ({
  ArrowRight: () => <span>→</span>,
  Lightbulb: () => <span>💡</span>,
  PenTool: () => <span>✏️</span>,
  Sparkles: () => <span>✨</span>,
}))

// Now import the component
const { InputStep } = require('@/components/workflow/InputStep')

describe('InputStep Minimal Test', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render without crashing', () => {
    expect(() => render(<InputStep />)).not.toThrow()
  })

  it('should find basic elements', () => {
    render(<InputStep />)
    
    // Try to find any text content
    const element = screen.getByRole('textbox')
    expect(element).toBeInTheDocument()
  })
})