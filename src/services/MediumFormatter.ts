import { MediumContent, MediumSection, CodeBlock, GistInfo, MediumExportOptions } from '@/types'

export class MediumFormatter {
  private extractTitle(content: string): string {
    const titleMatch = content.match(/^#\s+(.+)$/m)
    return titleMatch ? titleMatch[1].trim() : 'Untitled Article'
  }

  private extractSubtitle(content: string): string | undefined {
    // Look for the first paragraph after the title or the first ## header
    const lines = content.split('\n')
    const titleIndex = lines.findIndex(line => line.match(/^#\s+/))
    
    if (titleIndex === -1) return undefined
    
    // Check for ## header as subtitle
    const subtitleMatch = lines.slice(titleIndex + 1).find(line => line.match(/^##\s+/))
    if (subtitleMatch) {
      return subtitleMatch.replace(/^##\s+/, '').trim()
    }
    
    // Or use first non-empty paragraph
    const firstParagraph = lines.slice(titleIndex + 1).find(line => 
      line.trim() && !line.match(/^#+\s/) && !line.match(/^```/)
    )
    
    if (firstParagraph && firstParagraph.length < 120) {
      return firstParagraph.trim()
    }
    
    return undefined
  }

  extractCodeBlocks(content: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = []
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g
    let match
    let lineNumber = 1

    const lines = content.split('\n')
    
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

  private parseSections(content: string, codeBlocks: CodeBlock[], gists: GistInfo[]): MediumSection[] {
    const sections: MediumSection[] = []
    const lines = content.split('\n')
    let sectionId = 1

    // Create a map of code blocks to gists for replacement
    const codeToGistMap = new Map<string, GistInfo>()
    codeBlocks.forEach((block, index) => {
      if (gists[index]) {
        codeToGistMap.set(block.code, gists[index])
      }
    })

    let i = 0
    while (i < lines.length) {
      const line = lines[i].trim()

      if (!line) {
        i++
        continue
      }

      // Headers
      if (line.match(/^#+\s/)) {
        const level = (line.match(/^#+/) || [''])[0].length
        const text = line.replace(/^#+\s*/, '')
        
        // Convert H3+ to H2 for Medium compatibility
        const mediumLevel = Math.min(level, 2)
        
        sections.push({
          id: `section-${sectionId++}`,
          type: 'header',
          content: text,
          level: mediumLevel
        })
      }
      // Code blocks
      else if (line.startsWith('```')) {
        const language = line.replace('```', '') || 'text'
        const codeLines: string[] = []
        i++ // Skip opening ```
        
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i])
          i++
        }
        
        const codeContent = codeLines.join('\n').trim()
        const gist = codeToGistMap.get(codeContent)
        
        if (gist) {
          sections.push({
            id: `section-${sectionId++}`,
            type: 'gist-reference',
            content: `[View code on GitHub Gist](${gist.url})`,
            gistId: gist.id
          })
        } else {
          sections.push({
            id: `section-${sectionId++}`,
            type: 'code',
            content: codeContent
          })
        }
      }
      // Block quotes
      else if (line.startsWith('>')) {
        const quoteLines: string[] = []
        while (i < lines.length && (lines[i].trim().startsWith('>') || !lines[i].trim())) {
          if (lines[i].trim().startsWith('>')) {
            quoteLines.push(lines[i].trim().substring(1).trim())
          }
          i++
        }
        i-- // Back up one since we'll increment at the end
        
        sections.push({
          id: `section-${sectionId++}`,
          type: 'quote',
          content: quoteLines.join('\n')
        })
      }
      // Lists
      else if (line.match(/^\s*[-*]\s/) || line.match(/^\s*\d+\.\s/)) {
        const listLines: string[] = []
        while (i < lines.length && (lines[i].match(/^\s*[-*]\s/) || lines[i].match(/^\s*\d+\.\s/) || !lines[i].trim())) {
          if (lines[i].trim()) {
            // Flatten nested lists for Medium compatibility
            const cleanLine = lines[i].replace(/^\s*[-*]\s*/, '• ').replace(/^\s*\d+\.\s*/, '• ')
            listLines.push(cleanLine)
          }
          i++
        }
        i-- // Back up one since we'll increment at the end
        
        sections.push({
          id: `section-${sectionId++}`,
          type: 'list',
          content: listLines.join('\n')
        })
      }
      // Regular paragraphs
      else {
        const paragraphLines: string[] = []
        while (i < lines.length && lines[i].trim() && !lines[i].match(/^#+\s/) && !lines[i].startsWith('```') && !lines[i].startsWith('>') && !lines[i].match(/^\s*[-*]\s/) && !lines[i].match(/^\s*\d+\.\s/)) {
          paragraphLines.push(lines[i].trim())
          i++
        }
        i-- // Back up one since we'll increment at the end
        
        const paragraphContent = paragraphLines.join(' ')
        if (paragraphContent) {
          sections.push({
            id: `section-${sectionId++}`,
            type: 'paragraph',
            content: paragraphContent
          })
        }
      }

      i++
    }

    return sections
  }

  convertToMediumFormat(content: string, gists: GistInfo[] = []): MediumContent {
    const title = this.extractTitle(content)
    const subtitle = this.extractSubtitle(content)
    const codeBlocks = this.extractCodeBlocks(content)
    const sections = this.parseSections(content, codeBlocks, gists)
    
    // Calculate metadata
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
    const readingTime = Math.ceil(wordCount / 200)
    
    // Extract potential tags from content
    const tags = this.extractTags(content)

    return {
      title,
      subtitle,
      sections,
      codeBlocks,
      gists,
      metadata: {
        wordCount,
        readingTime,
        tags
      }
    }
  }

  private extractTags(content: string): string[] {
    const tags: string[] = []
    
    // Common programming languages and technologies
    const techKeywords = [
      'javascript', 'typescript', 'python', 'react', 'nodejs', 'ai', 'machine learning',
      'web development', 'mobile development', 'ios', 'android', 'swift', 'kotlin',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'github', 'api',
      'database', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis',
      'frontend', 'backend', 'fullstack', 'devops', 'cicd', 'testing'
    ]
    
    const lowerContent = content.toLowerCase()
    techKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword) && !tags.includes(keyword)) {
        tags.push(keyword)
      }
    })
    
    return tags.slice(0, 5) // Limit to 5 tags
  }

  generateMediumHTML(mediumContent: MediumContent): string {
    let html = `<h1>${mediumContent.title}</h1>\n`
    
    if (mediumContent.subtitle) {
      html += `<h2>${mediumContent.subtitle}</h2>\n\n`
    }

    mediumContent.sections.forEach(section => {
      switch (section.type) {
        case 'header':
          const headerTag = section.level === 1 ? 'h1' : 'h2'
          html += `<${headerTag}>${section.content}</${headerTag}>\n\n`
          break
        
        case 'paragraph':
          const formattedParagraph = this.formatInlineMarkdown(section.content)
          html += `<p>${formattedParagraph}</p>\n\n`
          break
        
        case 'list':
          const listItems = section.content.split('\n')
            .filter(item => item.trim())
            .map(item => `<li>${this.formatInlineMarkdown(item.replace(/^•\s*/, ''))}</li>`)
            .join('\n')
          html += `<ul>\n${listItems}\n</ul>\n\n`
          break
        
        case 'quote':
          const formattedQuote = this.formatInlineMarkdown(section.content)
          html += `<blockquote><p>${formattedQuote}</p></blockquote>\n\n`
          break
        
        case 'code':
          html += `<pre><code>${this.escapeHtml(section.content)}</code></pre>\n\n`
          break
        
        case 'gist-reference':
          const gist = mediumContent.gists.find(g => g.id === section.gistId)
          if (gist) {
            html += `<p><a href="${gist.url}" target="_blank">View ${gist.language} code on GitHub Gist</a></p>\n\n`
          }
          break
      }
    })

    return html.trim()
  }

  generateSectionHTML(section: MediumSection, gists: GistInfo[] = []): string {
    switch (section.type) {
      case 'header':
        const headerTag = section.level === 1 ? 'h1' : 'h2'
        return `<${headerTag}>${section.content}</${headerTag}>`
      
      case 'paragraph':
        const formattedParagraph = this.formatInlineMarkdown(section.content)
        return `<p>${formattedParagraph}</p>`
      
      case 'list':
        const listItems = section.content.split('\n')
          .filter(item => item.trim())
          .map(item => `<li>${this.formatInlineMarkdown(item.replace(/^•\s*/, ''))}</li>`)
          .join('\n')
        return `<ul>\n${listItems}\n</ul>`
      
      case 'quote':
        const formattedQuote = this.formatInlineMarkdown(section.content)
        return `<blockquote><p>${formattedQuote}</p></blockquote>`
      
      case 'code':
        return `<pre><code>${this.escapeHtml(section.content)}</code></pre>`
      
      case 'gist-reference':
        const gist = gists.find(g => g.id === section.gistId)
        if (gist) {
          return `<p><a href="${gist.url}" target="_blank">View ${gist.language} code on GitHub Gist</a></p>`
        }
        return section.content
      
      default:
        return section.content
    }
  }

  private formatInlineMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  generatePlainTextForMedium(mediumContent: MediumContent): string {
    let text = `${mediumContent.title}\n\n`
    
    if (mediumContent.subtitle) {
      text += `${mediumContent.subtitle}\n\n`
    }

    mediumContent.sections.forEach(section => {
      switch (section.type) {
        case 'header':
          text += `${'#'.repeat(section.level || 2)} ${section.content}\n\n`
          break
        
        case 'paragraph':
          text += `${section.content}\n\n`
          break
        
        case 'list':
          const listItems = section.content.split('\n')
            .filter(item => item.trim())
            .map(item => item.startsWith('•') ? item : `• ${item}`)
            .join('\n')
          text += `${listItems}\n\n`
          break
        
        case 'quote':
          const quotedText = section.content.split('\n')
            .map(line => `> ${line}`)
            .join('\n')
          text += `${quotedText}\n\n`
          break
        
        case 'code':
          text += `\`\`\`\n${section.content}\n\`\`\`\n\n`
          break
        
        case 'gist-reference':
          const gist = mediumContent.gists.find(g => g.id === section.gistId)
          if (gist) {
            text += `[View ${gist.language} code on GitHub Gist](${gist.url})\n\n`
          }
          break
      }
    })

    return text.trim()
  }
}

// Singleton instance
export const mediumFormatter = new MediumFormatter()