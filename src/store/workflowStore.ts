import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { ContentCategory, Question, Response, Article, ContentFormat, GeneratedLinkedInPost } from '@/types'
import { sessionManager } from '@/lib/session-manager'

export type WorkflowStep = 'input' | 'category' | 'questions' | 'format-selection' | 'generation' | 'edit'

interface WorkflowState {
  // Current workflow state
  currentStep: WorkflowStep
  userInput: string
  selectedCategory: ContentCategory | null
  questions: Question[]
  responses: Response[]
  
  // Multi-format support
  selectedFormats: ContentFormat[]
  generatedArticle: Article | null
  generatedLinkedIn: GeneratedLinkedInPost | null
  
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
  
  // Multi-format actions
  setSelectedFormats: (formats: ContentFormat[]) => void
  setGeneratedArticle: (article: Article) => void
  updateGeneratedArticle: (updates: Partial<Article>) => void
  setGeneratedLinkedIn: (linkedIn: GeneratedLinkedInPost) => void
  updateGeneratedLinkedIn: (updates: Partial<GeneratedLinkedInPost>) => void
  
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
  selectedFormats: [] as ContentFormat[],
  generatedArticle: null,
  generatedLinkedIn: null,
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
        
        setCurrentStep: (step) => {
          set({ currentStep: step })
          // Save session snapshot when workflow step changes
          sessionManager.saveSessionSnapshot({
            workflowStep: step,
            hasArticle: !!get().generatedArticle
          })
        },
        
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
        
        setSelectedFormats: (formats) => set({ selectedFormats: formats }),
        
        setGeneratedArticle: (article) => {
          set({ generatedArticle: article })
          // Save session snapshot when article is generated
          sessionManager.saveSessionSnapshot({
            workflowStep: get().currentStep,
            hasArticle: !!article
          })
        },
        
        updateGeneratedArticle: (updates) => {
          const current = get().generatedArticle
          if (current) {
            set({ generatedArticle: { ...current, ...updates } })
          }
        },
        
        setGeneratedLinkedIn: (linkedIn) => {
          set({ generatedLinkedIn: linkedIn })
          // Save session snapshot when LinkedIn content is generated
          sessionManager.saveSessionSnapshot({
            workflowStep: get().currentStep,
            hasArticle: !!get().generatedArticle || !!linkedIn
          })
        },
        
        updateGeneratedLinkedIn: (updates) => {
          const current = get().generatedLinkedIn
          if (current) {
            set({ generatedLinkedIn: { ...current, ...updates } })
          }
        },
        
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
          selectedFormats: state.selectedFormats,
          generatedArticle: state.generatedArticle,
          generatedLinkedIn: state.generatedLinkedIn,
        }),
      }
    ),
    { name: 'workflow-store' }
  )
)