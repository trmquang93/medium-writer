/**
 * Performance measurement utilities for comparing prefilled vs non-prefilled AI responses
 * This helps validate the effectiveness of the prefilling implementation
 */

import { AIProviderFactory } from '../ai-providers';
import { AIProviderType } from '@/types';

interface PerformanceMetrics {
  provider: AIProviderType;
  testCase: string;
  prefilled: boolean;
  responseTime: number;
  jsonParsingSuccess: boolean;
  retryCount: number;
  rawResponseLength: number;
  cleanedResponseLength: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  } | null;
  error: string | null;
}

interface ComparisonResult {
  testCase: string;
  provider: AIProviderType;
  prefilledMetrics: PerformanceMetrics;
  nonPrefilledMetrics: PerformanceMetrics;
  improvement: {
    responseTimeReduction: number; // percentage
    parsingSuccessImprovement: boolean;
    retryReduction: number;
    lengthEfficiency: number; // percentage of useful content
  };
}

export class PrefillingPerformanceAnalyzer {
  private results: PerformanceMetrics[] = [];

  /**
   * Test structured generation performance with and without prefilling
   */
  async runPerformanceComparison(
    provider: AIProviderType,
    apiKey: string,
    testCases: Array<{
      name: string;
      prompt: string;
      expectedSchema: any;
      prefill?: string;
    }>
  ): Promise<ComparisonResult[]> {
    const comparisons: ComparisonResult[] = [];

    for (const testCase of testCases) {
      console.log(`Testing ${testCase.name} with ${provider}...`);

      // Test with prefilling (if supported)
      const prefilledMetrics = await this.measureStructuredGeneration(
        provider,
        apiKey,
        testCase.name,
        testCase.prompt,
        testCase.expectedSchema,
        testCase.prefill,
        true
      );

      // Test without prefilling
      const nonPrefilledMetrics = await this.measureStructuredGeneration(
        provider,
        apiKey,
        testCase.name,
        testCase.prompt,
        testCase.expectedSchema,
        undefined,
        false
      );

      // Calculate improvements
      const improvement = this.calculateImprovement(prefilledMetrics, nonPrefilledMetrics);

      comparisons.push({
        testCase: testCase.name,
        provider,
        prefilledMetrics,
        nonPrefilledMetrics,
        improvement
      });

      // Add delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return comparisons;
  }

  /**
   * Measure performance of a single structured generation request
   */
  private async measureStructuredGeneration(
    provider: AIProviderType,
    apiKey: string,
    testCase: string,
    prompt: string,
    expectedSchema: any,
    prefill: string | undefined,
    attemptPrefilling: boolean
  ): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    let retryCount = 0;
    let error: string | null = null;
    let jsonParsingSuccess = false;
    let rawResponseLength = 0;
    let cleanedResponseLength = 0;
    let tokenUsage = null;

    try {
      const aiProvider = AIProviderFactory.createProvider(provider, apiKey);
      
      // Only use prefilling if provider supports it and we're attempting it
      const actualPrefill = (attemptPrefilling && aiProvider.supportsPrefilling()) ? prefill : undefined;

      const response = await aiProvider.generateStructuredContent({
        prompt,
        prefill: actualPrefill,
        expectsJson: true,
        options: {
          wordCount: 500,
          tone: 'professional',
          format: 'how-to'
        },
        maxRetries: 3
      });

      rawResponseLength = response.raw.length;
      cleanedResponseLength = JSON.stringify(response.data).length;
      jsonParsingSuccess = response.parsed;
      tokenUsage = response.usage ? {
        prompt: response.usage.promptTokens || 0,
        completion: response.usage.completionTokens || 0,
        total: response.usage.totalTokens || 0
      } : null;

      // Count retries by checking if the response was parsed successfully on first try
      retryCount = response.parsed ? 0 : 1;

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      retryCount = 3; // Max retries reached
    }

    const responseTime = Date.now() - startTime;

    const metrics: PerformanceMetrics = {
      provider,
      testCase,
      prefilled: attemptPrefilling,
      responseTime,
      jsonParsingSuccess,
      retryCount,
      rawResponseLength,
      cleanedResponseLength,
      tokenUsage,
      error
    };

    this.results.push(metrics);
    return metrics;
  }

  /**
   * Calculate improvement metrics between prefilled and non-prefilled responses
   */
  private calculateImprovement(
    prefilled: PerformanceMetrics,
    nonPrefilled: PerformanceMetrics
  ) {
    const responseTimeReduction = nonPrefilled.responseTime > 0 
      ? ((nonPrefilled.responseTime - prefilled.responseTime) / nonPrefilled.responseTime) * 100
      : 0;

    const parsingSuccessImprovement = prefilled.jsonParsingSuccess && !nonPrefilled.jsonParsingSuccess;

    const retryReduction = Math.max(0, nonPrefilled.retryCount - prefilled.retryCount);

    const lengthEfficiency = prefilled.rawResponseLength > 0
      ? (prefilled.cleanedResponseLength / prefilled.rawResponseLength) * 100
      : 0;

    return {
      responseTimeReduction,
      parsingSuccessImprovement,
      retryReduction,
      lengthEfficiency
    };
  }

  /**
   * Generate a comprehensive performance report
   */
  generateReport(comparisons: ComparisonResult[]): string {
    const report = [];
    
    report.push('# Prefilling Performance Analysis Report');
    report.push('');
    report.push('## Summary');
    
    const totalTests = comparisons.length;
    const successfulPrefillTests = comparisons.filter(c => c.prefilledMetrics.jsonParsingSuccess).length;
    const successfulNonPrefillTests = comparisons.filter(c => c.nonPrefilledMetrics.jsonParsingSuccess).length;
    
    report.push(`- Total test cases: ${totalTests}`);
    report.push(`- Prefilled success rate: ${((successfulPrefillTests / totalTests) * 100).toFixed(1)}%`);
    report.push(`- Non-prefilled success rate: ${((successfulNonPrefillTests / totalTests) * 100).toFixed(1)}%`);
    
    const avgResponseTimeReduction = comparisons
      .map(c => c.improvement.responseTimeReduction)
      .reduce((sum, val) => sum + val, 0) / comparisons.length;
    
    report.push(`- Average response time reduction: ${avgResponseTimeReduction.toFixed(1)}%`);
    report.push('');
    
    // Provider-specific results
    const providerGroups = comparisons.reduce((groups, comparison) => {
      if (!groups[comparison.provider]) {
        groups[comparison.provider] = [];
      }
      groups[comparison.provider].push(comparison);
      return groups;
    }, {} as Record<AIProviderType, ComparisonResult[]>);

    Object.entries(providerGroups).forEach(([provider, results]) => {
      report.push(`## ${provider.toUpperCase()} Results`);
      report.push('');
      
      results.forEach(result => {
        report.push(`### ${result.testCase}`);
        report.push('');
        report.push('| Metric | Prefilled | Non-Prefilled | Improvement |');
        report.push('|--------|-----------|---------------|-------------|');
        report.push(`| Response Time | ${result.prefilledMetrics.responseTime}ms | ${result.nonPrefilledMetrics.responseTime}ms | ${result.improvement.responseTimeReduction.toFixed(1)}% reduction |`);
        report.push(`| JSON Parsing | ${result.prefilledMetrics.jsonParsingSuccess ? '✅' : '❌'} | ${result.nonPrefilledMetrics.jsonParsingSuccess ? '✅' : '❌'} | ${result.improvement.parsingSuccessImprovement ? '✅ Improved' : '➖ No change'} |`);
        report.push(`| Retry Count | ${result.prefilledMetrics.retryCount} | ${result.nonPrefilledMetrics.retryCount} | ${result.improvement.retryReduction} fewer retries |`);
        report.push(`| Content Efficiency | ${result.improvement.lengthEfficiency.toFixed(1)}% | - | - |`);
        report.push('');
      });
    });

    // Recommendations
    report.push('## Recommendations');
    report.push('');
    
    const claudeResults = comparisons.filter(c => c.provider === 'anthropic');
    const otherResults = comparisons.filter(c => c.provider !== 'anthropic');
    
    if (claudeResults.length > 0) {
      const claudeImprovement = claudeResults
        .map(r => r.improvement.responseTimeReduction)
        .reduce((sum, val) => sum + val, 0) / claudeResults.length;
      
      report.push(`- **Claude (Anthropic)**: Average ${claudeImprovement.toFixed(1)}% response time improvement with native prefilling`);
    }
    
    if (otherResults.length > 0) {
      const otherImprovement = otherResults
        .map(r => r.improvement.responseTimeReduction)
        .reduce((sum, val) => sum + val, 0) / otherResults.length;
      
      report.push(`- **Other Providers**: Average ${otherImprovement.toFixed(1)}% improvement with enhanced prompting techniques`);
    }
    
    report.push('');
    report.push('## Technical Implementation Notes');
    report.push('');
    report.push('- Claude uses native assistant message prefilling for optimal JSON generation');
    report.push('- OpenAI and OpenRouter use system messages for structured output guidance');
    report.push('- Gemini uses enhanced prompt engineering with format examples');
    report.push('- All providers benefit from unified JSON cleaning and parsing pipeline');
    
    return report.join('\n');
  }

  /**
   * Export results to JSON for further analysis
   */
  exportResults(): { comparisons: ComparisonResult[]; rawMetrics: PerformanceMetrics[] } {
    return {
      comparisons: [],
      rawMetrics: this.results
    };
  }
}

/**
 * Predefined test cases for comprehensive prefilling evaluation
 */
export const STANDARD_TEST_CASES = [
  {
    name: 'Category Analysis',
    prompt: `Analyze this article idea and categorize it: "Building AI applications with React and TypeScript"

Provide analysis as JSON:`,
    expectedSchema: {
      primary: 'string',
      confidence: 'number',
      reasoning: 'string'
    },
    prefill: '{'
  },
  {
    name: 'Question Generation',  
    prompt: `Generate 3 follow-up questions for this topic: "Sustainable living practices"

Return as JSON array:`,
    expectedSchema: [
      {
        id: 'string',
        text: 'string',
        type: 'string'
      }
    ],
    prefill: '['
  },
  {
    name: 'Article Metadata',
    prompt: `Generate SEO metadata for an article about "Remote work productivity tips"

Return as JSON:`,
    expectedSchema: {
      title: 'string',
      description: 'string',
      keywords: ['string'],
      tags: ['string']
    },
    prefill: '{\n  "title": "'
  }
];

/**
 * Convenience function to run a quick performance test
 */
export async function runQuickPerformanceTest(
  provider: AIProviderType,
  apiKey: string
): Promise<string> {
  const analyzer = new PrefillingPerformanceAnalyzer();
  const results = await analyzer.runPerformanceComparison(provider, apiKey, [STANDARD_TEST_CASES[0]]);
  return analyzer.generateReport(results);
}