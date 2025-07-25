import { CodeBlock, MediumContent } from '@/types'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

class ExportValidator {
  static validateContent(content: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if content exists
    if (!content || !content.trim()) {
      errors.push('Content cannot be empty')
      return { isValid: false, errors, warnings }
    }

    // Check content length
    if (content.length < 100) {
      warnings.push('Content is very short - consider adding more detail')
    }

    if (content.length > 100000) {
      warnings.push('Content is very long - consider breaking into multiple articles')
    }

    // Check for title
    const hasTitle = content.match(/^#\s+.+$/m)
    if (!hasTitle) {
      warnings.push('No title found - consider adding a # Title at the beginning')
    }

    // Check for code blocks
    const codeBlocks = this.extractCodeBlocks(content)
    if (codeBlocks.length > 10) {
      warnings.push('Many code blocks detected - consider using GitHub Gists for better Medium compatibility')
    }

    // Check for nested lists
    const hasNestedLists = content.match(/^\s{2,}[-*]\s/m)
    if (hasNestedLists) {
      warnings.push('Nested lists detected - these will be flattened for Medium compatibility')
    }

    // Check for tables
    const hasTables = content.match(/\|.*\|/m)
    if (hasTables) {
      warnings.push('Tables detected - these are not supported in Medium and will need manual conversion')
    }

    // Check for complex markdown
    const hasComplexMarkdown = content.match(/```[\s\S]*?```[\s\S]*?```/)
    if (hasComplexMarkdown) {
      warnings.push('Multiple consecutive code blocks detected - consider spacing them with text')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static validateGitHubToken(token: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (!token) {
      warnings.push('No GitHub token provided - code blocks will not be converted to Gists')
      return { isValid: true, errors, warnings }
    }

    // Check token format
    const tokenPattern = /^gh[ps]_[A-Za-z0-9_]{36,251}$/
    if (!tokenPattern.test(token)) {
      errors.push('Invalid GitHub token format. Should start with "ghp_" or "ghs_"')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static validateCodeBlocks(codeBlocks: CodeBlock[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    codeBlocks.forEach((block, index) => {
      // Check for empty code blocks
      if (!block.code.trim()) {
        warnings.push(`Code block ${index + 1} is empty`)
      }

      // Check for very large code blocks
      if (block.code.length > 5000) {
        warnings.push(`Code block ${index + 1} is very large - consider splitting or using external files`)
      }

      // Check for potentially sensitive information
      if (this.containsSensitiveInfo(block.code)) {
        errors.push(`Code block ${index + 1} may contain sensitive information (API keys, passwords, etc.)`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  static validateMediumContent(mediumContent: MediumContent): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check title length
    if (mediumContent.title.length > 100) {
      warnings.push('Title is very long - consider shortening for better readability')
    }

    // Check subtitle length
    if (mediumContent.subtitle && mediumContent.subtitle.length > 200) {
      warnings.push('Subtitle is very long - consider shortening')
    }

    // Check section count
    if (mediumContent.sections.length > 50) {
      warnings.push('Many sections detected - consider breaking into multiple articles')
    }

    // Check for consecutive headers
    let consecutiveHeaders = 0
    mediumContent.sections.forEach((section, index) => {
      if (section.type === 'header') {
        consecutiveHeaders++
        if (consecutiveHeaders > 2) {
          warnings.push(`Multiple consecutive headers found around section ${index + 1} - consider adding content between headers`)
          consecutiveHeaders = 0
        }
      } else {
        consecutiveHeaders = 0
      }
    })

    // Check reading time
    if (mediumContent.metadata.readingTime > 20) {
      warnings.push('Very long article - consider breaking into a series')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private static extractCodeBlocks(content: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = []
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const beforeMatch = content.substring(0, match.index)
      const startLine = beforeMatch.split('\n').length
      const codeLines = match[2].split('\n')
      const endLine = startLine + codeLines.length - 1

      codeBlocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
        startLine,
        endLine
      })
    }

    return codeBlocks
  }

  private static containsSensitiveInfo(code: string): boolean {
    const sensitivePatterns = [
      /api[_-]?key/i,
      /secret[_-]?key/i,
      /password/i,
      /token/i,
      /private[_-]?key/i,
      /access[_-]?key/i,
      /sk-[a-zA-Z0-9]{48}/,  // OpenAI API key pattern
      /ghp_[a-zA-Z0-9]{36}/, // GitHub token pattern
      /[A-Za-z0-9+/]{40,}={0,2}/, // Base64 patterns
      /(?:\d{1,3}\.){3}\d{1,3}/, // IP addresses
      /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email addresses in code
    ]

    return sensitivePatterns.some(pattern => pattern.test(code))
  }
}

// Export class for static method usage
export { ExportValidator }