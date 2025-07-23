import { CategoryType, ContentCategory, GenerationOptions, Question, Response } from '@/types';

export interface CategoryPrompt {
  systemPrompt: string;
  questionTemplates: QuestionTemplate[];
  contentStructure: string[];
  seoGuidelines: string[];
  toneInstructions: Record<string, string>;
}

export interface QuestionTemplate {
  id: string;
  question: string;
  required: boolean;
  type: 'text' | 'select' | 'multiselect';
  options?: string[];
  placeholder?: string;
  maxLength?: number;
}

export class PromptTemplateSystem {
  private categoryPrompts: Record<string, CategoryPrompt> = {
    'TECHNOLOGY': {
      systemPrompt: `You are an expert technology writer specializing in creating comprehensive, engaging articles for Medium. Your expertise spans AI, programming, data science, web development, and emerging technologies. Write with authority while making complex concepts accessible to both beginners and experienced professionals.`,
      questionTemplates: [
        {
          id: 'tech_target_audience',
          question: 'Who is your target audience?',
          required: true,
          type: 'select',
          options: [
            'Beginners/Students',
            'Junior Developers',
            'Senior Developers',
            'Technical Leaders',
            'General Tech Enthusiasts',
            'Mixed Audience'
          ]
        },
        {
          id: 'tech_specific_focus',
          question: 'What specific technology or concept should be the main focus?',
          required: true,
          type: 'text',
          placeholder: 'e.g., React hooks, Machine Learning algorithms, Docker containers',
          maxLength: 200
        },
        {
          id: 'tech_practical_examples',
          question: 'Do you want to include code examples or practical demonstrations?',
          required: false,
          type: 'select',
          options: ['Yes, with detailed code', 'Yes, with simple examples', 'No, keep it conceptual']
        },
        {
          id: 'tech_current_trends',
          question: 'Should the article reference current industry trends or recent developments?',
          required: false,
          type: 'text',
          placeholder: 'e.g., Latest framework updates, industry news, market trends',
          maxLength: 300
        }
      ],
      contentStructure: [
        'Compelling hook related to technology impact',
        'Clear problem statement or opportunity',
        'Technical explanation with examples',
        'Practical applications and use cases',
        'Best practices and common pitfalls',
        'Future implications and trends',
        'Actionable next steps for readers'
      ],
      seoGuidelines: [
        'Include relevant programming languages or technologies in title',
        'Use technical keywords naturally throughout content',
        'Structure with clear headings for different concepts',
        'Include code snippets where appropriate',
        'Reference authoritative sources and documentation'
      ],
      toneInstructions: {
        professional: 'Authoritative but accessible, focusing on best practices and industry standards',
        casual: 'Friendly and approachable, using analogies to explain complex concepts',
        academic: 'Precise and research-focused, citing studies and technical documentation',
        conversational: 'Personal experience-driven, sharing lessons learned and practical insights'
      }
    },
    'PERSONAL_DEVELOPMENT': {
      systemPrompt: `You are an experienced personal development coach and writer who creates transformative content for Medium. Your articles inspire positive change, provide actionable advice, and help readers develop better habits, mindset, and life skills.`,
      questionTemplates: [
        {
          id: 'pd_main_challenge',
          question: 'What specific personal development challenge or goal should the article address?',
          required: true,
          type: 'text',
          placeholder: 'e.g., productivity, confidence, relationships, career growth',
          maxLength: 200
        },
        {
          id: 'pd_reader_stage',
          question: 'What stage of development is your reader likely in?',
          required: true,
          type: 'select',
          options: [
            'Just starting their journey',
            'Making some progress but stuck',
            'Advanced but seeking refinement',
            'Mixed levels'
          ]
        },
        {
          id: 'pd_personal_story',
          question: 'Should the article include personal stories or case studies?',
          required: false,
          type: 'select',
          options: ['Yes, personal anecdotes', 'Yes, case studies of others', 'No, focus on strategies']
        },
        {
          id: 'pd_actionable_steps',
          question: 'What type of actionable advice would be most valuable?',
          required: false,
          type: 'multiselect',
          options: [
            'Daily habits and routines',
            'Mindset shifts and reframing',
            'Specific exercises or activities',
            'Tools and resources',
            'Long-term strategies'
          ]
        }
      ],
      contentStructure: [
        'Relatable opening that connects with reader struggles',
        'Clear identification of the problem or opportunity',
        'Evidence-based insights or principles',
        'Step-by-step actionable strategies',
        'Real-world examples and success stories',
        'Common obstacles and how to overcome them',
        'Motivational conclusion with clear next steps'
      ],
      seoGuidelines: [
        'Use emotionally resonant keywords in title',
        'Include question-based headings readers might search for',
        'Reference psychology concepts and research where relevant',
        'Use personal pronouns to create connection',
        'Include practical tips that readers can immediately apply'
      ],
      toneInstructions: {
        professional: 'Expert guidance with research backing, maintaining empathy and understanding',
        casual: 'Friend-to-friend advice with personal touches and relatable examples',
        academic: 'Research-based approach citing psychological studies and expert opinions',
        conversational: 'Vulnerable and authentic, sharing personal struggles and breakthroughs'
      }
    },
    'BUSINESS': {
      systemPrompt: `You are a seasoned business strategist and entrepreneur who writes insightful Medium articles about business, entrepreneurship, finance, and leadership. Your content helps readers make better business decisions and grow their ventures.`,
      questionTemplates: [
        {
          id: 'business_focus_area',
          question: 'What business area should be the primary focus?',
          required: true,
          type: 'select',
          options: [
            'Startup Strategy',
            'Leadership & Management',
            'Marketing & Sales',
            'Finance & Investment',
            'Operations & Scaling',
            'Innovation & Disruption',
            'Industry Analysis'
          ]
        },
        {
          id: 'business_audience_level',
          question: 'What level of business experience should the article target?',
          required: true,
          type: 'select',
          options: [
            'Aspiring entrepreneurs',
            'Early-stage founders',
            'Established business owners',
            'Corporate professionals',
            'Investors',
            'Mixed audience'
          ]
        },
        {
          id: 'business_case_studies',
          question: 'Should the article include specific company examples or case studies?',
          required: false,
          type: 'text',
          placeholder: 'e.g., specific companies, success/failure stories, market examples',
          maxLength: 300
        },
        {
          id: 'business_data_focus',
          question: 'What type of data or metrics would strengthen the article?',
          required: false,
          type: 'multiselect',
          options: [
            'Market statistics',
            'Financial metrics',
            'Growth data',
            'Industry benchmarks',
            'Survey results',
            'Performance indicators'
          ]
        }
      ],
      contentStructure: [
        'Business problem or opportunity identification',
        'Market context and current landscape',
        'Strategic analysis with data support',
        'Actionable business insights',
        'Implementation strategies and frameworks',
        'Risk assessment and mitigation',
        'Key takeaways and next steps'
      ],
      seoGuidelines: [
        'Include business buzzwords and industry terminology',
        'Use numbers and statistics in headings where possible',
        'Reference well-known companies and business leaders',
        'Include frameworks, models, or methodologies',
        'Focus on ROI, growth, and success metrics'
      ],
      toneInstructions: {
        professional: 'Executive-level insights with strategic depth and data-driven analysis',
        casual: 'Entrepreneurial spirit with practical wisdom and relatable business stories',
        academic: 'Business school rigor with case study analysis and theoretical frameworks',
        conversational: 'Mentor-style guidance with personal business experiences and lessons learned'
      }
    },
    'LIFESTYLE': {
      systemPrompt: `You are a lifestyle writer who creates inspiring and practical content about relationships, health, wellness, travel, and life optimization. Your articles help readers live more fulfilling, balanced, and intentional lives.`,
      questionTemplates: [
        {
          id: 'lifestyle_main_topic',
          question: 'What lifestyle area should the article focus on?',
          required: true,
          type: 'select',
          options: [
            'Relationships & Dating',
            'Health & Fitness',
            'Mental Wellness',
            'Travel & Adventure',
            'Home & Living',
            'Food & Nutrition',
            'Work-Life Balance',
            'Personal Style'
          ]
        },
        {
          id: 'lifestyle_life_stage',
          question: 'What life stage or demographic should the article primarily address?',
          required: false,
          type: 'select',
          options: [
            'Young adults (20s)',
            'Professionals (30s-40s)',
            'Parents and families',
            'Empty nesters',
            'Retirees',
            'Universal appeal'
          ]
        },
        {
          id: 'lifestyle_personal_touch',
          question: 'Should the article include personal experiences or stories?',
          required: false,
          type: 'select',
          options: ['Yes, personal stories', 'Yes, others\' experiences', 'No, focus on advice']
        },
        {
          id: 'lifestyle_seasonal_relevance',
          question: 'Is there any seasonal or timing relevance to consider?',
          required: false,
          type: 'text',
          placeholder: 'e.g., New Year resolutions, summer travel, holiday stress',
          maxLength: 200
        }
      ],
      contentStructure: [
        'Engaging lifestyle hook that resonates with readers',
        'Common challenges or aspirations identification',
        'Practical tips and strategies',
        'Real-life examples and success stories',
        'Expert insights or research backing',
        'Common mistakes and how to avoid them',
        'Inspiring conclusion with actionable next steps'
      ],
      seoGuidelines: [
        'Use lifestyle keywords and trending topics',
        'Include seasonal and location-based terms where relevant',
        'Reference popular lifestyle brands, destinations, or trends',
        'Use aspirational language and benefit-focused headings',
        'Include practical tips and how-to elements'
      ],
      toneInstructions: {
        professional: 'Expert lifestyle guidance with credible sources and proven methods',
        casual: 'Friend sharing discoveries with warmth and relatability',
        academic: 'Research-backed lifestyle optimization with scientific evidence',
        conversational: 'Personal journey sharing with authentic experiences and lessons'
      }
    },
    'CURRENT_AFFAIRS': {
      systemPrompt: `You are an insightful current affairs writer who creates thoughtful Medium articles about politics, social issues, climate change, culture, and global events. Your content provides balanced analysis and helps readers understand complex issues.`,
      questionTemplates: [
        {
          id: 'affairs_topic_focus',
          question: 'What current affairs topic should the article address?',
          required: true,
          type: 'select',
          options: [
            'Political Analysis',
            'Social Justice Issues',
            'Climate & Environment',
            'Economic Trends',
            'Cultural Phenomena',
            'Global Events',
            'Technology & Society',
            'Public Policy'
          ]
        },
        {
          id: 'affairs_perspective',
          question: 'What analytical approach should the article take?',
          required: true,
          type: 'select',
          options: [
            'Balanced analysis of multiple viewpoints',
            'Critical examination of current policies',
            'Historical context and trends',
            'Future implications and predictions',
            'Personal impact and practical advice',
            'Call to action and solutions'
          ]
        },
        {
          id: 'affairs_scope',
          question: 'What geographical or demographic scope should the article cover?',
          required: false,
          type: 'select',
          options: [
            'Local/Regional',
            'National',
            'Global/International',
            'Specific demographic groups',
            'Cross-cultural comparison'
          ]
        },
        {
          id: 'affairs_sources',
          question: 'What types of sources and evidence should be emphasized?',
          required: false,
          type: 'multiselect',
          options: [
            'Recent news and reports',
            'Expert opinions and interviews',
            'Statistical data and research',
            'Historical precedents',
            'Personal testimonies',
            'Policy documents'
          ]
        }
      ],
      contentStructure: [
        'Current event or issue introduction with context',
        'Background information and historical perspective',
        'Multiple stakeholder viewpoints and analysis',
        'Data, evidence, and expert insights',
        'Broader implications and consequences',
        'Potential solutions or paths forward',
        'Call to action or reflection for readers'
      ],
      seoGuidelines: [
        'Use current event keywords and trending topics',
        'Include names of key figures, locations, and organizations',
        'Reference recent dates and timelines',
        'Use analytical and opinion-based language',
        'Include policy terms and official terminology'
      ],
      toneInstructions: {
        professional: 'Journalistic integrity with objective analysis and credible sourcing',
        casual: 'Accessible explanation of complex issues with relatable examples',
        academic: 'Scholarly analysis with extensive research and theoretical frameworks',
        conversational: 'Thoughtful commentary that invites reader reflection and discussion'
      }
    },
    'CREATIVE_WRITING': {
      systemPrompt: `You are an accomplished creative writing mentor and literary expert who creates engaging Medium articles about fiction, poetry, storytelling techniques, and creative expression. Your expertise spans literary analysis, narrative craft, character development, and the creative process. You write with both artistic insight and practical guidance, helping aspiring and experienced writers develop their craft.`,
      questionTemplates: [
        {
          id: 'creative_genre_focus',
          question: 'What genre or creative writing area should the article focus on?',
          required: true,
          type: 'select',
          options: [
            'Fiction Writing (Novels/Short Stories)',
            'Poetry & Verse',
            'Creative Nonfiction',
            'Screenwriting & Dialogue',
            'Literary Analysis & Criticism',
            'Writing Craft & Technique',
            'Publishing & Writer\'s Journey',
            'Mixed/General Creative Writing'
          ]
        },
        {
          id: 'creative_target_audience',
          question: 'Who is your target audience?',
          required: true,
          type: 'select',
          options: [
            'Aspiring writers (beginners)',
            'Intermediate writers developing skills',
            'Advanced writers seeking refinement',
            'Published authors and professionals',
            'Literature enthusiasts and readers',
            'Creative writing students and educators',
            'Mixed audience of writers and readers'
          ]
        },
        {
          id: 'creative_technique_focus',
          question: 'What specific writing techniques or elements should be emphasized?',
          required: false,
          type: 'multiselect',
          options: [
            'Character development and psychology',
            'Plot structure and pacing',
            'Voice and narrative style',
            'Dialogue and conversation',
            'Setting and world-building',
            'Literary devices and symbolism',
            'Editing and revision process',
            'Inspiration and creative process'
          ]
        },
        {
          id: 'creative_examples_style',
          question: 'What type of examples and references would be most valuable?',
          required: false,
          type: 'select',
          options: [
            'Classic literature and renowned authors',
            'Contemporary works and modern techniques',
            'Mix of classic and contemporary examples',
            'Original examples and creative exercises',
            'Analysis of specific literary works',
            'Personal writing experiences and case studies'
          ]
        },
        {
          id: 'creative_practical_application',
          question: 'Should the article include practical exercises or writing prompts?',
          required: false,
          type: 'select',
          options: [
            'Yes, with detailed writing exercises',
            'Yes, with creative prompts and challenges',
            'Yes, with analysis activities',
            'No, focus on theory and examples',
            'Mix of theory and practical application'
          ]
        }
      ],
      contentStructure: [
        'Compelling creative hook that engages fellow writers',
        'Clear identification of the writing challenge or opportunity',
        'Literary context and examples from established works',
        'Detailed exploration of techniques and methods',
        'Practical applications and exercises for readers',
        'Common creative obstacles and solutions',
        'Inspiring conclusion with actionable next steps for writers'
      ],
      seoGuidelines: [
        'Include creative writing keywords and literary terms',
        'Reference famous authors, books, and literary movements',
        'Use craft-specific terminology (plot, character arc, voice, etc.)',
        'Include genre-specific keywords where relevant',
        'Reference writing tools, techniques, and methodologies'
      ],
      toneInstructions: {
        professional: 'Literary expertise with scholarly depth, analyzing craft elements with precision and authority',
        casual: 'Fellow writer sharing discoveries with warmth, using accessible language and relatable creative struggles',
        academic: 'Scholarly literary analysis with critical theory backing and rigorous examination of texts and techniques',
        conversational: 'Intimate mentor-style guidance with personal creative insights and vulnerable sharing of the artistic journey'
      }
    },
    'EDUCATION_LEARNING': {
      systemPrompt: `You are an experienced educator and learning specialist who creates comprehensive Medium articles about teaching methods, learning techniques, educational technology, and skill development. Your expertise spans pedagogy, cognitive science, educational psychology, and modern learning methodologies. You write with both academic rigor and practical wisdom, helping learners, teachers, and education professionals improve their effectiveness.`,
      questionTemplates: [
        {
          id: 'education_focus_area',
          question: 'What educational focus area should the article address?',
          required: true,
          type: 'select',
          options: [
            'Learning Techniques & Study Methods',
            'Teaching Strategies & Pedagogy',
            'Educational Technology & Digital Tools',
            'Skill Development & Training',
            'Online Learning & E-Learning',
            'Academic Success & Student Performance',
            'Adult Learning & Professional Development',
            'Educational Psychology & Cognitive Science'
          ]
        },
        {
          id: 'education_target_audience',
          question: 'Who is your primary target audience?',
          required: true,
          type: 'select',
          options: [
            'Students (K-12 and college)',
            'Adult learners and professionals',
            'Teachers and educators',
            'Parents supporting children\'s learning',
            'Corporate trainers and HR professionals',
            'Online course creators and instructors',
            'Self-directed learners',
            'Mixed educational audience'
          ]
        },
        {
          id: 'education_learning_context',
          question: 'What learning context or environment should be emphasized?',
          required: false,
          type: 'select',
          options: [
            'Traditional classroom settings',
            'Online and remote learning',
            'Workplace training and development',
            'Self-directed and independent study',
            'Hybrid/blended learning approaches',
            'Informal and lifelong learning',
            'Skills-based and vocational training'
          ]
        },
        {
          id: 'education_methodology_focus',
          question: 'What educational methodologies or approaches should be featured?',
          required: false,
          type: 'multiselect',
          options: [
            'Active learning and engagement techniques',
            'Spaced repetition and memory strategies',
            'Project-based and experiential learning',
            'Collaborative and social learning',
            'Personalized and adaptive learning',
            'Gamification and learning motivation',
            'Assessment and feedback strategies',
            'Learning analytics and data-driven education'
          ]
        },
        {
          id: 'education_evidence_base',
          question: 'What type of evidence and research should support the content?',
          required: false,
          type: 'select',
          options: [
            'Cognitive science and brain research',
            'Educational research and peer-reviewed studies',
            'Practical case studies and success stories',
            'Expert interviews and practitioner insights',
            'Data analytics and learning metrics',
            'Mix of research and practical experience'
          ]
        }
      ],
      contentStructure: [
        'Educational challenge or learning opportunity identification',
        'Scientific foundation and research backing',
        'Detailed methodology or technique explanation',
        'Practical implementation strategies and examples',
        'Real-world applications and case studies',
        'Common learning obstacles and solutions',
        'Actionable next steps and resources for continued learning'
      ],
      seoGuidelines: [
        'Include education and learning keywords naturally',
        'Reference educational theorists, researchers, and institutions',
        'Use pedagogical terminology and learning science concepts',
        'Include specific learning tools, platforms, and methodologies',
        'Reference academic levels, subjects, and educational contexts'
      ],
      toneInstructions: {
        professional: 'Educational expertise with research-backed recommendations and scholarly approach to learning science',
        casual: 'Friendly teacher sharing practical wisdom with accessible explanations and relatable learning experiences',
        academic: 'Rigorous educational research with citations, methodology analysis, and theoretical framework examination',
        conversational: 'Mentoring approach with personal teaching insights and learner-centered guidance'
      }
    },
    'ENTERTAINMENT_MEDIA': {
      systemPrompt: `You are an experienced entertainment journalist and media critic who creates engaging Medium articles about movies, TV shows, music, gaming, pop culture, and media industry analysis. Your expertise spans entertainment criticism, cultural analysis, industry trends, and media studies. You write with both insider knowledge and audience accessibility, helping readers understand and appreciate entertainment content while providing valuable industry insights.`,
      questionTemplates: [
        {
          id: 'entertainment_media_type',
          question: 'What type of entertainment media should the article focus on?',
          required: true,
          type: 'select',
          options: [
            'Movies & Cinema',
            'Television & Streaming Shows',
            'Music & Audio Entertainment',
            'Video Games & Gaming Culture',
            'Social Media & Digital Entertainment',
            'Books & Literature',
            'Theater & Live Performance',
            'Pop Culture & Celebrity',
            'Media Industry Analysis'
          ]
        },
        {
          id: 'entertainment_content_approach',
          question: 'What approach should the article take?',
          required: true,
          type: 'select',
          options: [
            'Review and critique of specific content',
            'Industry trends and analysis',
            'Cultural impact and significance',
            'Behind-the-scenes and production insights',
            'Historical context and evolution',
            'Audience behavior and fandom analysis',
            'Creator spotlight and interviews',
            'Comparative analysis and rankings'
          ]
        },
        {
          id: 'entertainment_target_audience',
          question: 'Who is your primary target audience?',
          required: false,
          type: 'select',
          options: [
            'General entertainment enthusiasts',
            'Industry professionals and creatives',
            'Fans of specific genres or franchises',
            'Critics and media scholars',
            'Content creators and influencers',
            'Students and researchers',
            'Casual consumers seeking recommendations'
          ]
        },
        {
          id: 'entertainment_analysis_depth',
          question: 'How deep should the analysis go?',
          required: false,
          type: 'select',
          options: [
            'Surface-level overview and highlights',
            'Moderate analysis with key insights',
            'Deep dive with detailed examination',
            'Academic-level critical analysis',
            'Mix of accessibility and depth'
          ]
        },
        {
          id: 'entertainment_current_relevance',
          question: 'Should the article connect to current trends or recent releases?',
          required: false,
          type: 'text',
          placeholder: 'e.g., latest releases, trending topics, cultural moments, industry news',
          maxLength: 300
        }
      ],
      contentStructure: [
        'Engaging hook that captures entertainment excitement',
        'Clear focus on the specific media or trend being discussed',
        'Contextual background and industry landscape',
        'Detailed analysis or review with specific examples',
        'Cultural significance and broader implications',
        'Audience impact and reception analysis',
        'Compelling conclusion with recommendations or predictions'
      ],
      seoGuidelines: [
        'Include specific titles, names, and entertainment keywords',
        'Reference popular actors, directors, creators, and celebrities',
        'Use genre-specific terminology and industry jargon appropriately',
        'Include release dates, platform names, and current trends',
        'Reference awards, box office numbers, and cultural phenomena'
      ],
      toneInstructions: {
        professional: 'Industry insider expertise with authoritative analysis and professional media criticism standards',
        casual: 'Entertainment enthusiast sharing discoveries with relatable pop culture references and accessible insights',
        academic: 'Scholarly media studies approach with theoretical frameworks and critical analysis of cultural significance',
        conversational: 'Passionate fan perspective with personal reactions and engaging storytelling about entertainment experiences'
      }
    },
    'SCIENCE_RESEARCH': {
      systemPrompt: `You are an accomplished science communicator and researcher who creates compelling Medium articles about scientific discoveries, research methodologies, academic studies, and science communication. Your expertise spans multiple scientific disciplines, research methodology, peer review processes, and translating complex scientific concepts for general audiences. You write with both scientific rigor and public accessibility, helping readers understand and appreciate scientific progress.`,
      questionTemplates: [
        {
          id: 'science_field_focus',
          question: 'What scientific field or research area should the article focus on?',
          required: true,
          type: 'select',
          options: [
            'Biology & Life Sciences',
            'Physics & Astronomy',
            'Chemistry & Materials Science',
            'Medicine & Health Research',
            'Environmental & Climate Science',
            'Psychology & Neuroscience',
            'Computer Science & AI Research',
            'Mathematics & Statistics',
            'Social Sciences & Behavioral Research',
            'Interdisciplinary & General Science'
          ]
        },
        {
          id: 'science_content_type',
          question: 'What type of scientific content should the article present?',
          required: true,
          type: 'select',
          options: [
            'Recent research findings and discoveries',
            'Research methodology and scientific process',
            'Historical scientific breakthroughs',
            'Current controversies and debates',
            'Practical applications and implications',
            'Science communication and public understanding',
            'Career insights and academic perspectives',
            'Future research directions and predictions'
          ]
        },
        {
          id: 'science_target_audience',
          question: 'Who is your primary target audience?',
          required: false,
          type: 'select',
          options: [
            'General public with science interest',
            'Students and early-career researchers',
            'Fellow scientists and academics',
            'Science educators and communicators',
            'Policy makers and decision makers',
            'Industry professionals',
            'Science journalists and writers'
          ]
        },
        {
          id: 'science_complexity_level',
          question: 'What level of scientific complexity should the article maintain?',
          required: false,
          type: 'select',
          options: [
            'Accessible to general audiences',
            'Moderate scientific background assumed',
            'Advanced scientific knowledge required',
            'Mixed levels with clear explanations',
            'Adaptive complexity based on topic'
          ]
        },
        {
          id: 'science_evidence_focus',
          question: 'What types of evidence and sources should be emphasized?',
          required: false,
          type: 'multiselect',
          options: [
            'Peer-reviewed research papers',
            'Meta-analyses and systematic reviews',
            'Recent conference presentations',
            'Expert interviews and opinions',
            'Data visualizations and statistics',
            'Historical context and precedents',
            'Real-world applications and case studies'
          ]
        }
      ],
      contentStructure: [
        'Compelling scientific hook that engages curiosity',
        'Clear research question or scientific problem statement',
        'Methodological approach and evidence explanation',
        'Key findings and their significance',
        'Broader implications and real-world applications',
        'Limitations, uncertainties, and future research needs',
        'Actionable insights and takeaways for readers'
      ],
      seoGuidelines: [
        'Include scientific terminology and research keywords',
        'Reference specific studies, researchers, and institutions',
        'Use discipline-specific language and methodology terms',
        'Include numerical data, statistics, and research metrics',
        'Reference journals, conferences, and academic publications'
      ],
      toneInstructions: {
        professional: 'Scientific authority with rigorous methodology discussion and evidence-based conclusions',
        casual: 'Science enthusiast sharing discoveries with accessible explanations and relatable analogies',
        academic: 'Scholarly scientific writing with comprehensive literature review and methodological rigor',
        conversational: 'Curious researcher sharing insights with personal scientific journey and discovery narratives'
      }
    }
  };

  getCategoryPrompt(category: CategoryType): CategoryPrompt {
    return this.categoryPrompts[category];
  }

  getQuestionTemplates(category: CategoryType): QuestionTemplate[] {
    return this.categoryPrompts[category].questionTemplates;
  }

  buildArticlePrompt(
    category: CategoryType,
    userInput: string,
    responses: Response[],
    options: GenerationOptions
  ): string {
    const categoryPrompt = this.getCategoryPrompt(category);
    const { wordCount, tone, format } = options;

    // Build context from user responses
    const contextSection = this.buildContextFromResponses(responses, categoryPrompt.questionTemplates);
    
    // Get tone-specific instructions
    const toneInstruction = categoryPrompt.toneInstructions[tone] || categoryPrompt.toneInstructions.professional;

    // Build content structure guidance
    const structureGuidance = this.buildStructureGuidance(format, categoryPrompt.contentStructure);

    // Build SEO guidelines section
    const seoSection = this.buildSEOGuidelines(categoryPrompt.seoGuidelines);

    return `${categoryPrompt.systemPrompt}

ARTICLE TOPIC: ${userInput}

CONTENT CATEGORY: ${category}

${contextSection}

WRITING REQUIREMENTS:
- Target word count: ${wordCount} words (±10% acceptable)
- Tone: ${tone} (${toneInstruction})
- Format: ${format}
- Platform: Medium (use Medium-appropriate formatting)

${structureGuidance}

${seoSection}

FORMATTING GUIDELINES:
- Use clear hierarchy with # for main title, ## for major sections, ### for subsections
- Include engaging subheadings that break up content
- Use bullet points and numbered lists where appropriate
- Add blockquotes for important insights or quotes
- Include relevant examples and case studies
- Ensure smooth transitions between sections

QUALITY STANDARDS:
- Engaging introduction that hooks the reader immediately
- Clear value proposition - why should readers care?
- Evidence-based content with credible sources where relevant
- Actionable insights readers can implement
- Strong conclusion that reinforces key takeaways
- Optimized for Medium's algorithm and reader engagement

Please create a comprehensive, publication-ready article that meets all these requirements and provides genuine value to Medium readers in the ${category} category.`;
  }

  buildCategoryAnalysisPrompt(userInput: string): string {
    const categories = Object.keys(this.categoryPrompts).map(cat => 
      cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
    ).join(', ');

    return `You are an expert content categorization system. Analyze the following user input and determine which content category it best fits into.

USER INPUT: "${userInput}"

AVAILABLE CATEGORIES: ${categories}

Please respond with a JSON object in the following format:
{
  "primary": "category-name",
  "secondary": "category-name-or-null",
  "confidence": 0.85,
  "reasoning": "Explanation of why this categorization was chosen"
}

CATEGORY DEFINITIONS:
- Technology: AI, Programming, Data Science, Web Development, Tech Trends
- Personal Development: Self-improvement, Mental Health, Psychology, Productivity, Life Skills
- Business: Entrepreneurship, Finance, Startups, Leadership, Marketing, Strategy
- Lifestyle: Relationships, Health & Wellness, Travel, Food, Home, Work-Life Balance
- Current Affairs: Politics, Climate Change, Culture, Social Issues, Global Events
- Creative Writing: Fiction, Poetry, Storytelling, Literary Analysis, Creative Expression, Narrative Craft
- Education Learning: Teaching Methods, Learning Techniques, Educational Technology, Skill Development, Academic Success
- Entertainment Media: Movies, TV Shows, Music, Gaming, Pop Culture, Media Analysis, Celebrity Culture
- Science Research: Scientific Discoveries, Research Methodology, Academic Studies, Science Communication, Peer Review

Analyze the content, intent, and likely audience to make the best categorization decision.`;
  }

  buildQuestionGenerationPrompt(
    category: CategoryType,
    userInput: string,
    maxQuestions: number = 5
  ): string {
    const categoryPrompt = this.getCategoryPrompt(category);
    const templateQuestions = categoryPrompt.questionTemplates
      .slice(0, maxQuestions)
      .map((q, index) => `${index + 1}. ${q.question}${q.required ? ' (Required)' : ' (Optional)'}`)
      .join('\n');

    return `You are an expert content strategist. Based on the user's input and the content category, generate personalized questions that will help create a comprehensive, engaging article.

USER INPUT: "${userInput}"
CATEGORY: ${category}
MAXIMUM QUESTIONS: ${maxQuestions}

TEMPLATE QUESTIONS FOR ${category.toUpperCase()}:
${templateQuestions}

Your task is to:
1. Adapt the template questions to be more specific to the user's topic
2. Generate additional relevant questions if needed
3. Ensure questions will elicit information that improves article quality
4. Focus on questions that help determine tone, audience, examples, and specific angles

Please respond with a JSON array of question objects:
[
  {
    "id": "unique_id",
    "question": "Your customized question?",
    "required": true/false,
    "type": "text" | "select" | "multiselect",
    "options": ["option1", "option2"] // only for select/multiselect
  }
]

Make the questions specific, actionable, and directly relevant to creating an excellent ${category} article about "${userInput}".`;
  }

  private buildContextFromResponses(responses: Response[], templates: QuestionTemplate[]): string {
    if (responses.length === 0) {
      return '';
    }

    const contextItems: string[] = [];
    
    responses.forEach(response => {
      const template = templates.find(t => t.id === response.questionId);
      if (template && response.answer.trim()) {
        contextItems.push(`• ${template.question} ${response.answer}`);
      }
    });

    if (contextItems.length === 0) {
      return '';
    }

    return `ADDITIONAL CONTEXT:
${contextItems.join('\n')}

`;
  }

  private buildStructureGuidance(format: string, defaultStructure: string[]): string {
    const formatStructures: Record<string, string[]> = {
      'how-to': [
        'Problem/need identification',
        'Prerequisites or requirements',
        'Step-by-step instructions with examples',
        'Tips for success and troubleshooting',
        'Summary and next steps'
      ],
      'listicle': [
        'Compelling introduction with list preview',
        'Each list item with detailed explanation',
        'Examples or evidence for each point',
        'Conclusion tying points together',
        'Call to action'
      ],
      'opinion': [
        'Strong opening statement or hook',
        'Context and background',
        'Main argument with supporting evidence',
        'Addressing counterarguments',
        'Reinforcing conclusion'
      ],
      'personal-story': [
        'Setting the scene',
        'The journey or experience',
        'Challenges and revelations',
        'Lessons learned',
        'Broader applications for readers'
      ],
      'tutorial': [
        'Learning objectives',
        'Prerequisites and setup',
        'Main tutorial content with examples',
        'Practice exercises or applications',
        'Next steps and advanced topics'
      ]
    };

    const structure = formatStructures[format] || defaultStructure;

    return `ARTICLE STRUCTURE (${format.toUpperCase()} format):
${structure.map((item, index) => `${index + 1}. ${item}`).join('\n')}

`;
  }

  private buildSEOGuidelines(guidelines: string[]): string {
    return `SEO OPTIMIZATION:
${guidelines.map(guideline => `• ${guideline}`).join('\n')}

`;
  }

  // Helper method to get all available categories
  getAvailableCategories(): CategoryType[] {
    return Object.keys(this.categoryPrompts) as CategoryType[];
  }

  // Helper method to get category metadata
  getCategoryMetadata(category: CategoryType) {
    const prompt = this.getCategoryPrompt(category);
    return {
      category,
      questionCount: prompt.questionTemplates.length,
      requiredQuestions: prompt.questionTemplates.filter(q => q.required).length,
      structurePoints: prompt.contentStructure.length,
      seoGuidelines: prompt.seoGuidelines.length,
      supportedTones: Object.keys(prompt.toneInstructions)
    };
  }
}

// Export singleton instance
export const promptTemplates = new PromptTemplateSystem();