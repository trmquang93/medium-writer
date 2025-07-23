import { CategoryType, ArticleTone, ArticleFormat, AIProviderType } from '@/types';

// Content Categories Configuration
export const CONTENT_CATEGORIES: Record<CategoryType, {
  label: string;
  description: string;
  icon: string;
  examples: string[];
}> = {
  'TECHNOLOGY': {
    label: 'Technology',
    description: 'AI, Programming, Data Science, Web Development',
    icon: '💻',
    examples: ['AI tutorials', 'Programming guides', 'Tech trends', 'Development tools']
  },
  'PERSONAL_DEVELOPMENT': {
    label: 'Personal Development',
    description: 'Self-improvement, Mental Health, Psychology',
    icon: '🌱',
    examples: ['Self-help', 'Productivity tips', 'Mental wellness', 'Life advice']
  },
  'BUSINESS': {
    label: 'Business',
    description: 'Entrepreneurship, Finance, Startups',
    icon: '💼',
    examples: ['Startup advice', 'Business strategy', 'Finance tips', 'Leadership']
  },
  'LIFESTYLE': {
    label: 'Lifestyle',
    description: 'Relationships, Health & Wellness',
    icon: '🌟',
    examples: ['Relationship advice', 'Health tips', 'Travel', 'Wellness']
  },
  'CURRENT_AFFAIRS': {
    label: 'Current Affairs',
    description: 'Politics, Climate Change, Culture',
    icon: '🌍',
    examples: ['Political analysis', 'Climate issues', 'Cultural trends', 'Social commentary']
  },
  'CREATIVE_WRITING': {
    label: 'Creative Writing',
    description: 'Fiction, Poetry, Storytelling, Creative Expression',
    icon: '✍️',
    examples: ['Short stories', 'Poetry analysis', 'Writing techniques', 'Character development', 'Narrative craft']
  },
  'EDUCATION_LEARNING': {
    label: 'Education & Learning',
    description: 'Teaching, Learning Methods, Educational Technology, Skill Development',
    icon: '📚',
    examples: ['Learning techniques', 'Educational tools', 'Study methods', 'Teaching strategies', 'Online learning']
  },
  'ENTERTAINMENT_MEDIA': {
    label: 'Entertainment & Media',
    description: 'Movies, TV Shows, Music, Gaming, Pop Culture, Media Analysis',
    icon: '🎬',
    examples: ['Movie reviews', 'TV show analysis', 'Music industry trends', 'Gaming culture', 'Entertainment news']
  },
  'SCIENCE_RESEARCH': {
    label: 'Science & Research',
    description: 'Scientific Discoveries, Research Methods, Academic Studies, Science Communication',
    icon: '🔬',
    examples: ['Research findings', 'Scientific methodology', 'Study analysis', 'Science communication', 'Academic insights']
  }
};

// AI Providers Configuration
export const AI_PROVIDERS: Record<AIProviderType, {
  name: string;
  displayName: string;
  description: string;
  models: string[];
  websiteUrl: string;
  docsUrl: string;
}> = {
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'GPT-4 and GPT-3.5 models for high-quality content generation',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    websiteUrl: 'https://openai.com',
    docsUrl: 'https://platform.openai.com/docs'
  },
  gemini: {
    name: 'gemini',
    displayName: 'Google Gemini',
    description: 'Google\'s advanced AI model with multimodal capabilities',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
    websiteUrl: 'https://ai.google.dev',
    docsUrl: 'https://ai.google.dev/docs'
  },
  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic Claude',
    description: 'Claude 3 models optimized for helpful, harmless, and honest content',
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    websiteUrl: 'https://www.anthropic.com',
    docsUrl: 'https://docs.anthropic.com'
  },
  openrouter: {
    name: 'openrouter',
    displayName: 'OpenRouter',
    description: 'Access to multiple AI models through a unified interface',
    models: ['multiple'],
    websiteUrl: 'https://openrouter.ai',
    docsUrl: 'https://openrouter.ai/docs'
  }
};

// Article Configuration
export const ARTICLE_TONES: Record<ArticleTone, {
  label: string;
  description: string;
}> = {
  professional: {
    label: 'Professional',
    description: 'Formal, authoritative, business-appropriate'
  },
  casual: {
    label: 'Casual',
    description: 'Relaxed, conversational, approachable'
  },
  academic: {
    label: 'Academic',
    description: 'Scholarly, research-based, analytical'
  },
  conversational: {
    label: 'Conversational',
    description: 'Personal, engaging, story-driven'
  }
};

export const ARTICLE_FORMATS: Record<ArticleFormat, {
  label: string;
  description: string;
  structure: string[];
}> = {
  'how-to': {
    label: 'How-to Guide',
    description: 'Step-by-step instructional content',
    structure: ['Introduction', 'Prerequisites', 'Step-by-step instructions', 'Tips & troubleshooting', 'Conclusion']
  },
  'listicle': {
    label: 'Listicle',
    description: 'List-based article format',
    structure: ['Introduction', 'List items with explanations', 'Summary', 'Call to action']
  },
  'opinion': {
    label: 'Opinion Piece',
    description: 'Personal viewpoint or analysis',
    structure: ['Hook', 'Context', 'Argument', 'Evidence', 'Counterarguments', 'Conclusion']
  },
  'personal-story': {
    label: 'Personal Story',
    description: 'Narrative-driven personal experience',
    structure: ['Setting the scene', 'The story', 'Lessons learned', 'Takeaways for readers']
  },
  'tutorial': {
    label: 'Tutorial',
    description: 'Detailed educational content',
    structure: ['Overview', 'Learning objectives', 'Prerequisites', 'Main content', 'Practice exercises', 'Next steps']
  },
  'analysis': {
    label: 'Analysis',
    description: 'In-depth analytical content',
    structure: ['Executive summary', 'Background', 'Data analysis', 'Insights', 'Implications', 'Conclusions']
  }
};

// Word Count Options
export const WORD_COUNT_OPTIONS = [
  { value: 800, label: '500-1000 words (Quick read)' },
  { value: 1500, label: '1000-2000 words (Medium read)' },
  { value: 2500, label: '2000-3000 words (Deep dive)' },
  { value: 3500, label: '3000+ words (Comprehensive)' }
];

// Application Configuration
export const APP_CONFIG = {
  name: 'Medium AI Writing Assistant',
  version: '1.0.0',
  maxSessionDuration: 2 * 60 * 60 * 1000, // 2 hours
  maxArticleLength: 10000, // words
  minArticleLength: 300, // words
  maxQuestions: 8,
  minQuestions: 3,
  maxResponseLength: 1000, // characters
  autoSaveInterval: 30000, // 30 seconds
  debounceDelay: 500, // milliseconds
  toastDuration: 5000, // milliseconds
};

// Performance Targets
export const PERFORMANCE_TARGETS = {
  categoryAnalysis: 5000, // 5 seconds
  questionGeneration: 10000, // 10 seconds
  articleGeneration: 60000, // 60 seconds
  contentModification: 30000, // 30 seconds
  exportOperation: 5000, // 5 seconds
};

// SEO Configuration
export const SEO_CONFIG = {
  titleLength: { min: 30, max: 60 },
  descriptionLength: { min: 120, max: 160 },
  maxTags: 5,
  minTags: 3,
  keywordDensity: { min: 0.5, max: 2.5 }, // percentage
};

// Error Messages
export const ERROR_MESSAGES = {
  API_KEY_MISSING: 'Please provide a valid API key for the selected AI provider',
  API_KEY_INVALID: 'The provided API key is invalid or expired',
  GENERATION_FAILED: 'Failed to generate content. Please try again',
  NETWORK_ERROR: 'Network error. Please check your internet connection',
  SESSION_EXPIRED: 'Your session has expired. Please refresh the page',
  CONTENT_TOO_LONG: 'Content exceeds maximum length limit',
  INVALID_INPUT: 'Please provide valid input for article generation',
  PROVIDER_UNAVAILABLE: 'Selected AI provider is currently unavailable',
  QUOTA_EXCEEDED: 'API quota exceeded. Please try again later',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  ARTICLE_GENERATED: 'Article generated successfully!',
  CONTENT_EXPORTED: 'Content exported successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
  API_KEY_VALIDATED: 'API key validated successfully',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  LAST_PROVIDER: 'medium_ai_last_provider',
  USER_PREFERENCES: 'medium_ai_preferences',
  SESSION_DATA: 'medium_ai_session',
  API_KEYS: 'medium_ai_api_keys',
};