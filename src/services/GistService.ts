import { GistInfo, CodeBlock } from '@/types'

interface GitHubGistResponse {
  id: string
  html_url: string
  files: Record<string, {
    filename: string
    type: string
    language: string
    raw_url: string
    size: number
    content: string
  }>
  description: string
  created_at: string
  public: boolean
}

export class GistService {
  private apiKey: string | null = null
  private baseUrl = 'https://api.github.com/gists'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey
  }

  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      csharp: 'cs',
      go: 'go',
      rust: 'rs',
      php: 'php',
      ruby: 'rb',
      swift: 'swift',
      kotlin: 'kt',
      scala: 'scala',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      xml: 'xml',
      yaml: 'yml',
      sql: 'sql',
      bash: 'sh',
      shell: 'sh',
      powershell: 'ps1',
      dockerfile: 'dockerfile',
      markdown: 'md',
      text: 'txt'
    }
    
    return extensions[language.toLowerCase()] || 'txt'
  }

  private generateFilename(language: string, customName?: string): string {
    if (customName) {
      return customName.includes('.') ? customName : `${customName}.${this.getFileExtension(language)}`
    }
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')
    return `code-example-${timestamp}.${this.getFileExtension(language)}`
  }

  async createGist(codeBlock: CodeBlock, isPublic: boolean = true): Promise<GistInfo> {
    if (!this.apiKey) {
      throw new Error('GitHub API key is required to create Gists')
    }

    const filename = this.generateFilename(codeBlock.language, codeBlock.filename)
    const description = `Code example from Medium Writing Assistant - ${codeBlock.language}`

    const requestBody = {
      description,
      public: isPublic,
      files: {
        [filename]: {
          content: codeBlock.code
        }
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `token ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`GitHub API error: ${response.status} - ${errorText}`)
      }

      const gistData: GitHubGistResponse = await response.json()
      
      return {
        id: gistData.id,
        url: gistData.html_url,
        embedUrl: `https://gist.github.com/${gistData.id}.js`,
        filename,
        language: codeBlock.language,
        description: gistData.description,
        createdAt: new Date(gistData.created_at)
      }
    } catch (error) {
      console.error('Failed to create Gist:', error)
      throw error
    }
  }

  async createMultipleGists(codeBlocks: CodeBlock[], isPublic: boolean = true): Promise<GistInfo[]> {
    const gists: GistInfo[] = []
    
    for (const codeBlock of codeBlocks) {
      try {
        const gist = await this.createGist(codeBlock, isPublic)
        gists.push(gist)
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Failed to create Gist for ${codeBlock.language} code:`, error)
        // Continue with other code blocks even if one fails
      }
    }
    
    return gists
  }

  async updateGist(gistId: string, codeBlock: CodeBlock): Promise<GistInfo> {
    if (!this.apiKey) {
      throw new Error('GitHub API key is required to update Gists')
    }

    const filename = this.generateFilename(codeBlock.language, codeBlock.filename)
    
    const requestBody = {
      files: {
        [filename]: {
          content: codeBlock.code
        }
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`GitHub API error: ${response.status} - ${errorText}`)
      }

      const gistData: GitHubGistResponse = await response.json()
      
      return {
        id: gistData.id,
        url: gistData.html_url,
        embedUrl: `https://gist.github.com/${gistData.id}.js`,
        filename,
        language: codeBlock.language,
        description: gistData.description,
        createdAt: new Date(gistData.created_at)
      }
    } catch (error) {
      console.error('Failed to update Gist:', error)
      throw error
    }
  }

  async deleteGist(gistId: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('GitHub API key is required to delete Gists')
    }

    try {
      const response = await fetch(`${this.baseUrl}/${gistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${this.apiKey}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`GitHub API error: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('Failed to delete Gist:', error)
      throw error
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }

  validateApiKey(): boolean {
    return !!(this.apiKey && this.apiKey.match(/^gh[ps]_[A-Za-z0-9_]{36,251}$/))
  }
}

// Singleton instance
export const gistService = new GistService()