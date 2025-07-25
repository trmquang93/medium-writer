import { MediumContent, MediumExportOptions, GistInfo, ExportFormat } from '@/types'
import { mediumFormatter } from './MediumFormatter'
import { gistService } from './GistService'
import { ExportValidator, ValidationResult } from '@/utils/exportValidation'

export interface ExportResult {
  format: ExportFormat
  content: string
  filename?: string
  sections?: string[]
  gists?: GistInfo[]
  success: boolean
  error?: string
  validation?: ValidationResult
}

export class MediumExportService {
  async exportContent(
    content: string, 
    format: ExportFormat, 
    options: Partial<MediumExportOptions> = {}
  ): Promise<ExportResult> {
    try {
      // Validate content first
      const contentValidation = ExportValidator.validateContent(content)
      if (!contentValidation.isValid) {
        return {
          format,
          content: '',
          success: false,
          error: contentValidation.errors.join(', '),
          validation: contentValidation
        }
      }

      // Validate GitHub token if provided
      if (options.githubToken) {
        const tokenValidation = ExportValidator.validateGitHubToken(options.githubToken)
        if (!tokenValidation.isValid) {
          return {
            format,
            content: '',
            success: false,
            error: tokenValidation.errors.join(', '),
            validation: tokenValidation
          }
        }
      }

      const mediumContent = mediumFormatter.convertToMediumFormat(content)
      
      // Validate the processed Medium content
      const mediumValidation = ExportValidator.validateMediumContent(mediumContent)
      const codeValidation = ExportValidator.validateCodeBlocks(mediumContent.codeBlocks)
      
      // Combine all validations
      const combinedValidation: ValidationResult = {
        isValid: contentValidation.isValid && mediumValidation.isValid && codeValidation.isValid,
        errors: [...contentValidation.errors, ...mediumValidation.errors, ...codeValidation.errors],
        warnings: [...contentValidation.warnings, ...mediumValidation.warnings, ...codeValidation.warnings]
      }
      
      // Handle Gist creation if requested
      let gists: GistInfo[] = []
      if (options.createGists && options.githubToken && mediumContent.codeBlocks.length > 0) {
        try {
          gistService.setApiKey(options.githubToken)
          gists = await gistService.createMultipleGists(mediumContent.codeBlocks)
          mediumContent.gists = gists
        } catch (gistError) {
          console.warn('Failed to create some Gists:', gistError)
          combinedValidation.warnings.push('Some code blocks could not be converted to GitHub Gists')
        }
      }

      const title = this.generateFilename(mediumContent.title)

      switch (format) {
        case 'medium-optimized':
          return {
            format,
            content: this.generateMediumOptimizedContent(mediumContent),
            filename: `${title}_medium_ready.html`,
            gists,
            success: true,
            validation: combinedValidation
          }

        case 'medium-sections':
          const sections = this.generateSectionContent(mediumContent)
          return {
            format,
            content: sections.join('\n\n---\n\n'),
            sections,
            filename: `${title}_sections.html`,
            gists,
            success: true,
            validation: combinedValidation
          }

        case 'rich-html':
          return {
            format,
            content: this.generateRichHTML(mediumContent),
            filename: `${title}_rich.html`,
            gists,
            success: true,
            validation: combinedValidation
          }

        default:
          throw new Error(`Unsupported export format: ${format}`)
      }
    } catch (error) {
      console.error('Export failed:', error)
      return {
        format,
        content: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private generateMediumOptimizedContent(mediumContent: MediumContent): string {
    let html = ''
    
    // Title as H1
    html += `<h1>${mediumContent.title}</h1>\n\n`
    
    // Subtitle as first paragraph or H2
    if (mediumContent.subtitle) {
      if (mediumContent.subtitle.length > 60) {
        html += `<p><em>${mediumContent.subtitle}</em></p>\n\n`
      } else {
        html += `<h2>${mediumContent.subtitle}</h2>\n\n`
      }
    }

    // Process sections with Medium-specific optimizations
    mediumContent.sections.forEach(section => {
      switch (section.type) {
        case 'header':
          // All headers become H2 for Medium compatibility
          html += `<h2>${section.content}</h2>\n\n`
          break
        
        case 'paragraph':
          const formattedParagraph = this.optimizeTextForMedium(section.content)
          html += `<p>${formattedParagraph}</p>\n\n`
          break
        
        case 'list':
          // Flatten nested lists and use simple bullets
          const listItems = section.content.split('\n')
            .filter(item => item.trim())
            .map(item => {
              const cleanItem = item.replace(/^[•\-\*]\s*/, '').trim()
              return `<li>${this.optimizeTextForMedium(cleanItem)}</li>`
            })
            .join('\n')
          html += `<ul>\n${listItems}\n</ul>\n\n`
          break
        
        case 'quote':
          const formattedQuote = this.optimizeTextForMedium(section.content)
          html += `<blockquote><p>${formattedQuote}</p></blockquote>\n\n`
          break
        
        case 'code':
          // For inline code without Gists, use simple code blocks
          html += `<pre><code>${this.escapeHtml(section.content)}</code></pre>\n\n`
          break
        
        case 'gist-reference':
          const gist = mediumContent.gists.find(g => g.id === section.gistId)
          if (gist) {
            // Medium can embed Gists directly
            html += `<p><strong>Code Example:</strong> <a href="${gist.url}" target="_blank">View ${gist.language} code on GitHub Gist</a></p>\n\n`
            // Add embed script for Medium
            html += `<script src="${gist.embedUrl}"></script>\n\n`
          }
          break
      }
    })

    // Add Medium-specific metadata
    if (mediumContent.metadata.tags.length > 0) {
      html += `\n\n<!-- Tags: ${mediumContent.metadata.tags.join(', ')} -->\n`
    }
    
    html += `\n<!-- Reading time: ${mediumContent.metadata.readingTime} minutes -->\n`
    html += `<!-- Word count: ${mediumContent.metadata.wordCount} words -->\n`

    return html.trim()
  }

  private generateSectionContent(mediumContent: MediumContent): string[] {
    const sections: string[] = []
    
    // Title section
    let titleSection = `<h1>${mediumContent.title}</h1>`
    if (mediumContent.subtitle) {
      titleSection += `\n<h2>${mediumContent.subtitle}</h2>`
    }
    sections.push(titleSection)

    // Group related sections together
    let currentGroup: string[] = []
    let currentGroupType: string | null = null

    mediumContent.sections.forEach((section, index) => {
      const sectionHTML = mediumFormatter.generateSectionHTML(section, mediumContent.gists)
      
      // Determine if we should start a new group
      const shouldStartNewGroup = 
        currentGroupType !== section.type || 
        section.type === 'header' ||
        currentGroup.length >= 3

      if (shouldStartNewGroup && currentGroup.length > 0) {
        sections.push(currentGroup.join('\n\n'))
        currentGroup = []
      }

      currentGroup.push(sectionHTML)
      currentGroupType = section.type

      // If this is the last section, add the current group
      if (index === mediumContent.sections.length - 1) {
        sections.push(currentGroup.join('\n\n'))
      }
    })

    return sections
  }

  private generateRichHTML(mediumContent: MediumContent): string {
    const html = mediumFormatter.generateMediumHTML(mediumContent)
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${mediumContent.title}</title>
    <style>
        body {
            max-width: 680px;
            margin: 0 auto;
            padding: 20px;
            font-family: medium-content-serif-font, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: 21px;
            line-height: 1.58;
            color: rgba(41, 41, 41, 1);
        }
        
        h1 {
            font-family: medium-content-sans-serif-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 42px;
            font-weight: 700;
            line-height: 1.04;
            letter-spacing: -0.015em;
            margin: 0 0 30px 0;
        }
        
        h2 {
            font-family: medium-content-sans-serif-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 32px;
            font-weight: 700;
            line-height: 1.15;
            letter-spacing: -0.02em;
            margin: 40px 0 16px 0;
        }
        
        p {
            margin: 0 0 30px 0;
            word-wrap: break-word;
        }
        
        blockquote {
            border-left: 3px solid rgba(41, 41, 41, 1);
            padding-left: 20px;
            margin: 30px 0;
            font-style: italic;
        }
        
        ul, ol {
            margin: 30px 0;
            padding-left: 30px;
        }
        
        li {
            margin: 10px 0;
        }
        
        pre {
            background-color: rgba(242, 242, 242, 1);
            padding: 20px;
            border-radius: 3px;
            overflow-x: auto;
            margin: 30px 0;
        }
        
        code {
            font-family: Menlo, Monaco, "Courier New", Courier, monospace;
            font-size: 16px;
            line-height: 1.4;
        }
        
        a {
            color: inherit;
            text-decoration: underline;
        }
        
        strong {
            font-weight: 700;
        }
        
        em {
            font-style: italic;
        }
        
        .metadata {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid rgba(230, 230, 230, 1);
            font-size: 16px;
            color: rgba(117, 117, 117, 1);
        }
    </style>
</head>
<body>
    ${html}
    
    <div class="metadata">
        <p><strong>Reading time:</strong> ${mediumContent.metadata.readingTime} minutes</p>
        <p><strong>Word count:</strong> ${mediumContent.metadata.wordCount} words</p>
        ${mediumContent.metadata.tags.length > 0 ? `<p><strong>Tags:</strong> ${mediumContent.metadata.tags.join(', ')}</p>` : ''}
        ${mediumContent.gists.length > 0 ? `<p><strong>Code examples:</strong> ${mediumContent.gists.length} GitHub Gist${mediumContent.gists.length > 1 ? 's' : ''}</p>` : ''}
    </div>
</body>
</html>`
  }

  private optimizeTextForMedium(text: string): string {
    return text
      // Convert markdown formatting to HTML
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim()
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  private generateFilename(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
  }
}

// Singleton instance
export const mediumExportService = new MediumExportService()