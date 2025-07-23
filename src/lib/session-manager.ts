import { AIProviderType } from '@/types'
import { ApiKeyManager } from './api-key-manager'

export interface SessionData {
  timestamp: number
  providers: AIProviderType[]
  selectedProvider: AIProviderType
  workflowStep: string
  hasArticle: boolean
  version: string
}

export class SessionManager {
  private static instance: SessionManager
  private readonly SESSION_KEY = 'medium_ai_session_info'
  private readonly MAX_SESSION_AGE = 24 * 60 * 60 * 1000 // 24 hours

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  /**
   * Save current session state to localStorage
   */
  saveSessionSnapshot(data: Partial<SessionData>): void {
    try {
      const apiKeyManager = ApiKeyManager.getInstance()
      const sessionInfo = apiKeyManager.getSessionInfo()
      
      const sessionData: SessionData = {
        timestamp: Date.now(),
        providers: sessionInfo.providers,
        selectedProvider: data.selectedProvider || 'openai',
        workflowStep: data.workflowStep || 'input',
        hasArticle: data.hasArticle || false,
        version: '1.0.0',
        ...data
      }

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData))
    } catch (error) {
      console.warn('Failed to save session snapshot:', error)
    }
  }

  /**
   * Load session data from localStorage
   */
  loadSessionSnapshot(): SessionData | null {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY)
      if (!stored) return null

      const data: SessionData = JSON.parse(stored)
      
      // Check if session is too old
      if (Date.now() - data.timestamp > this.MAX_SESSION_AGE) {
        this.clearSessionSnapshot()
        return null
      }

      return data
    } catch (error) {
      console.warn('Failed to load session snapshot:', error)
      return null
    }
  }

  /**
   * Clear stored session data
   */
  clearSessionSnapshot(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY)
    } catch (error) {
      console.warn('Failed to clear session snapshot:', error)
    }
  }

  /**
   * Check if there's a valid session to restore
   */
  hasValidSession(): boolean {
    const snapshot = this.loadSessionSnapshot()
    return snapshot !== null && snapshot.providers.length > 0
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    hasSession: boolean
    age: number
    providersCount: number
    lastStep: string
  } {
    const snapshot = this.loadSessionSnapshot()
    
    if (!snapshot) {
      return {
        hasSession: false,
        age: 0,
        providersCount: 0,
        lastStep: 'input'
      }
    }

    return {
      hasSession: true,
      age: Date.now() - snapshot.timestamp,
      providersCount: snapshot.providers.length,
      lastStep: snapshot.workflowStep
    }
  }

  /**
   * Update session activity
   */
  updateActivity(): void {
    const snapshot = this.loadSessionSnapshot()
    if (snapshot) {
      this.saveSessionSnapshot({
        ...snapshot,
        timestamp: Date.now()
      })
    }
  }
}

export const sessionManager = SessionManager.getInstance()