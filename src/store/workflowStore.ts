import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { ContentCategory, Question, Response, Article } from '@/types'

export type WorkflowStep = 'input' | 'category' | 'questions' | 'generation' | 'edit'

interface WorkflowState {
  // Current workflow state
  currentStep: WorkflowStep
  userInput: string
  selectedCategory: ContentCategory | null
  questions: Question[]
  responses: Response[]
  generatedArticle: Article | null
  isLoading: boolean
  error: string | null
  
  // Progress tracking
  totalQuestions: number
  currentQuestionIndex: number
  generationProgress: number
  
  // Actions
  setCurrentStep: (step: WorkflowStep) => void
  setUserInput: (input: string) => void
  setSelectedCategory: (category: ContentCategory) => void
  setQuestions: (questions: Question[]) => void
  addResponse: (response: Response) => void
  setGeneratedArticle: (article: Article) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setGenerationProgress: (progress: number) => void
  nextQuestion: () => void
  previousQuestion: () => void
  resetWorkflow: () => void
}

const initialState = {
  currentStep: 'input' as WorkflowStep,
  userInput: '',
  selectedCategory: null,
  questions: [],
  responses: [],
  generatedArticle: null,
  isLoading: false,
  error: null,
  totalQuestions: 0,
  currentQuestionIndex: 0,
  generationProgress: 0,
}

export const useWorkflowStore = create<WorkflowState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        setCurrentStep: (step) => set({ currentStep: step }),
        
        setUserInput: (input) => set({ userInput: input }),
        
        setSelectedCategory: (category) => set({ selectedCategory: category }),
        
        setQuestions: (questions) => 
          set({ 
            questions, 
            totalQuestions: questions.length,
            currentQuestionIndex: 0 
          }),
        
        addResponse: (response) => {
          const responses = [...get().responses, response]
          set({ responses })
        },
        
        setGeneratedArticle: (article) => set({ generatedArticle: article }),
        
        setLoading: (loading) => set({ isLoading: loading }),
        
        setError: (error) => set({ error }),
        
        setGenerationProgress: (progress) => set({ generationProgress: progress }),
        
        nextQuestion: () => {
          const { currentQuestionIndex, totalQuestions } = get()
          if (currentQuestionIndex < totalQuestions - 1) {
            set({ currentQuestionIndex: currentQuestionIndex + 1 })
          }
        },
        
        previousQuestion: () => {
          const { currentQuestionIndex } = get()
          if (currentQuestionIndex > 0) {
            set({ currentQuestionIndex: currentQuestionIndex - 1 })
          }
        },
        
        resetWorkflow: () => set(initialState),
      }),
      {
        name: 'workflow-state',
        partialize: (state) => ({
          currentStep: state.currentStep,
          userInput: state.userInput,
          selectedCategory: state.selectedCategory,
          responses: state.responses,
          generatedArticle: state.generatedArticle,
        }),
      }
    ),
    { name: 'workflow-store' }
  )
)