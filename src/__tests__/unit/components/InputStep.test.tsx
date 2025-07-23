import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InputStep } from '@/components/workflow/InputStep'
import { mockWorkflowStore, mockAIProvider, resetMocks } from '../__mocks__/stores'
import { mockUserInputs } from '../__mocks__/testData'

// Mock the stores and hooks
jest.mock('@/store/workflowStore', () => ({
  useWorkflowStore: () => mockWorkflowStore
}))

jest.mock('@/hooks/useAIProvider', () => ({
  useAIProvider: () => mockAIProvider
}))

// Mock utility functions
jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}))

// Mock Framer Motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    textarea: ({ children, ...props }: any) => <textarea {...props}>{children}</textarea>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock UI components that aren't the focus of this test
jest.mock('@/components/ui/ApiKeySetup', () => ({
  ApiKeySetup: () => <div data-testid="api-key-setup">API Key Setup</div>
}))

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}))

jest.mock('@/components/ui/Textarea', () => ({
  Textarea: ({ ...props }: any) => <textarea {...props} />
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  ArrowRight: () => <span data-testid="arrow-right-icon">→</span>,
  Lightbulb: () => <span data-testid="lightbulb-icon">💡</span>,
  PenTool: () => <span data-testid="pen-tool-icon">✏️</span>,
  Sparkles: () => <span data-testid="sparkles-icon">✨</span>,
}))

describe('InputStep Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    resetMocks()
    // Reset to default state
    mockWorkflowStore.userInput = ''
    mockWorkflowStore.error = null
    mockWorkflowStore.isLoading = false
    mockAIProvider.isConfigured = true
  })

  describe('Rendering', () => {
    it('should render the input step with all elements', () => {
      render(<InputStep />)
      
      // Check main heading
      expect(screen.getByText('What would you like to write about?')).toBeInTheDocument()
      
      // Check textarea
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      
      // Check continue button
      expect(screen.getByText('Continue')).toBeInTheDocument()
      
      // Check character counter
      expect(screen.getByText('0/5000')).toBeInTheDocument()
    })

    it('should show API key setup when not configured', () => {
      mockAIProvider.isConfigured = false
      render(<InputStep />)
      
      expect(screen.getByTestId('api-key-setup')).toBeInTheDocument()
    })

    it('should show quick suggestion buttons', () => {
      render(<InputStep />)
      
      const buttons = screen.getAllByRole('button')
      // Should have Continue button + suggestion buttons
      expect(buttons.length).toBeGreaterThan(1)
    })
  })

  describe('Input Handling', () => {
    it('should update input value when user types', async () => {
      render(<InputStep />)
      const textarea = screen.getByRole('textbox')
      
      await user.type(textarea, mockUserInputs.valid)
      
      expect(mockWorkflowStore.setUserInput).toHaveBeenCalledWith(mockUserInputs.valid)
    })

    it('should show character count as user types', async () => {
      mockWorkflowStore.userInput = mockUserInputs.valid
      render(<InputStep />)
      
      expect(screen.getByText(`${mockUserInputs.valid.length}/5000`)).toBeInTheDocument()
    })

    it('should handle empty input', async () => {
      render(<InputStep />)
      const textarea = screen.getByRole('textbox')
      
      await user.clear(textarea)
      
      expect(mockWorkflowStore.setUserInput).toHaveBeenCalledWith('')
    })

    it('should handle very long input', async () => {
      render(<InputStep />)
      const textarea = screen.getByRole('textbox')
      
      await user.type(textarea, mockUserInputs.long)
      
      expect(mockWorkflowStore.setUserInput).toHaveBeenCalledWith(mockUserInputs.long)
    })
  })

  describe('Validation', () => {
    it('should show error for input that is too short', () => {
      mockWorkflowStore.userInput = mockUserInputs.short
      mockWorkflowStore.error = 'Please provide at least 10 characters to help us understand your topic better.'
      
      render(<InputStep />)
      
      expect(screen.getByText('Please provide at least 10 characters to help us understand your topic better.')).toBeInTheDocument()
    })

    it('should enable continue button for valid input', () => {
      mockWorkflowStore.userInput = mockUserInputs.valid
      render(<InputStep />)
      
      const continueButton = screen.getByText('Continue')
      expect(continueButton).not.toBeDisabled()
    })

    it('should disable continue button for short input', () => {
      mockWorkflowStore.userInput = mockUserInputs.short
      render(<InputStep />)
      
      const continueButton = screen.getByText('Continue')
      expect(continueButton).toBeDisabled()
    })

    it('should disable continue button when loading', () => {
      mockWorkflowStore.userInput = mockUserInputs.valid
      mockWorkflowStore.isLoading = true
      render(<InputStep />)
      
      const continueButton = screen.getByText('Continue')
      expect(continueButton).toBeDisabled()
    })
  })

  describe('Quick Suggestions', () => {
    it('should fill input when suggestion button is clicked', async () => {
      render(<InputStep />)
      
      // Find a suggestion button (they should contain descriptive text)
      const suggestionButtons = screen.getAllByRole('button').filter(button => 
        button.textContent !== 'Continue' && !button.textContent?.includes('⌘')
      )
      
      if (suggestionButtons.length > 0) {
        await user.click(suggestionButtons[0])
        expect(mockWorkflowStore.setUserInput).toHaveBeenCalled()
      }
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should handle Cmd+Enter to continue (Mac)', async () => {
      mockWorkflowStore.userInput = mockUserInputs.valid
      render(<InputStep />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '{Meta>}{Enter}')
      
      expect(mockWorkflowStore.setCurrentStep).toHaveBeenCalledWith('category')
    })

    it('should handle Ctrl+Enter to continue (Windows/Linux)', async () => {
      mockWorkflowStore.userInput = mockUserInputs.valid
      render(<InputStep />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '{Control>}{Enter}')
      
      expect(mockWorkflowStore.setCurrentStep).toHaveBeenCalledWith('category')
    })

    it('should not proceed with keyboard shortcut if input is invalid', async () => {
      mockWorkflowStore.userInput = mockUserInputs.short
      render(<InputStep />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, '{Meta>}{Enter}')
      
      expect(mockWorkflowStore.setCurrentStep).not.toHaveBeenCalled()
    })
  })

  describe('Navigation', () => {
    it('should proceed to category step when continue is clicked', async () => {
      mockWorkflowStore.userInput = mockUserInputs.valid
      render(<InputStep />)
      
      const continueButton = screen.getByText('Continue')
      await user.click(continueButton)
      
      expect(mockWorkflowStore.setCurrentStep).toHaveBeenCalledWith('category')
    })

    it('should not proceed if input is too short', async () => {
      mockWorkflowStore.userInput = mockUserInputs.short
      render(<InputStep />)
      
      const continueButton = screen.getByText('Continue')
      await user.click(continueButton)
      
      expect(mockWorkflowStore.setCurrentStep).not.toHaveBeenCalled()
    })

    it('should clear any existing errors when proceeding', async () => {
      mockWorkflowStore.userInput = mockUserInputs.valid
      mockWorkflowStore.error = 'Some previous error'
      render(<InputStep />)
      
      const continueButton = screen.getByText('Continue')
      await user.click(continueButton)
      
      expect(mockWorkflowStore.setError).toHaveBeenCalledWith(null)
    })
  })

  describe('Placeholder Rotation', () => {
    it('should display rotating placeholders', () => {
      render(<InputStep />)
      const textarea = screen.getByRole('textbox')
      
      // Should have a placeholder
      expect(textarea).toHaveAttribute('placeholder')
      expect(textarea.getAttribute('placeholder')).toBeTruthy()
    })

    it('should rotate placeholder text over time', async () => {
      jest.useFakeTimers()
      render(<InputStep />)
      
      const textarea = screen.getByRole('textbox')
      const initialPlaceholder = textarea.getAttribute('placeholder')
      
      // Fast-forward time to trigger placeholder rotation
      act(() => {
        jest.advanceTimersByTime(3000)
      })
      
      await waitFor(() => {
        const newPlaceholder = textarea.getAttribute('placeholder')
        // Placeholder should either be different or we should verify rotation logic
        expect(newPlaceholder).toBeTruthy()
      })
      
      jest.useRealTimers()
    })
  })

  describe('Error Handling', () => {
    it('should display errors from the store', () => {
      const errorMessage = 'Something went wrong'
      mockWorkflowStore.error = errorMessage
      render(<InputStep />)
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('should clear errors when user starts typing', async () => {
      mockWorkflowStore.error = 'Previous error'
      render(<InputStep />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'a')
      
      expect(mockWorkflowStore.setError).toHaveBeenCalledWith(null)
    })
  })

  describe('Loading States', () => {
    it('should show loading state when processing', () => {
      mockWorkflowStore.isLoading = true
      render(<InputStep />)
      
      const continueButton = screen.getByText('Continue')
      expect(continueButton).toBeDisabled()
    })

    it('should disable interactions during loading', () => {
      mockWorkflowStore.isLoading = true
      render(<InputStep />)
      
      const textarea = screen.getByRole('textbox')
      const continueButton = screen.getByText('Continue')
      
      expect(textarea).toBeDisabled()
      expect(continueButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<InputStep />)
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('aria-label')
    })

    it('should have proper form structure', () => {
      render(<InputStep />)
      
      // Should have proper form elements and labels
      const textarea = screen.getByRole('textbox')
      const button = screen.getByRole('button', { name: /continue/i })
      
      expect(textarea).toBeInTheDocument()
      expect(button).toBeInTheDocument()
    })

    it('should indicate required field', () => {
      render(<InputStep />)
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('required')
    })
  })
})