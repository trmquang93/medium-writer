# Medium AI Writing Assistant

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel&logoColor=white)](https://vercel.com)
[![GitHub](https://img.shields.io/badge/Source-GitHub-black?logo=github&logoColor=white)](https://github.com/trmquang93/medium-writer)

Transform your ideas into publication-ready Medium articles with the power of AI. Generate high-quality content across multiple categories in minutes, not hours.

## Features

- 🤖 **Multi-Provider AI Integration**: Support for OpenAI, Google Gemini, Anthropic Claude, and OpenRouter
- 📝 **Intelligent Content Generation**: AI analyzes your ideas and creates structured, engaging articles
- 🎯 **5 Content Categories**: Technology, Personal Development, Business, Lifestyle, Current Affairs
- ✏️ **Real-time Editing**: Inline editing with AI-powered content modifications
- 📤 **Multiple Export Formats**: Markdown, HTML, Plain Text, and Clipboard
- 🔒 **Privacy-First**: Session-based storage, no user accounts required
- 📱 **Responsive Design**: Works seamlessly on desktop and tablet devices

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone git@github.com:trmquang93/medium-writer.git
cd medium-writer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your AI provider API keys in `.env.local` (optional - can also be set in the UI):
```
OPENAI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Share Your Idea**: Enter your article topic or rough concept
2. **AI Analysis**: System categorizes content and asks clarifying questions  
3. **Content Generation**: AI creates a complete, structured Medium article
4. **Edit & Export**: Refine content and export in your preferred format

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

### Project Structure

```
src/
├── app/              # Next.js app directory
├── components/       # Reusable UI components
├── lib/             # Utility libraries
│   └── ai-providers/ # AI provider implementations
├── types/           # TypeScript type definitions
├── hooks/           # Custom React hooks
├── store/           # State management
├── utils/           # Helper functions
└── constants/       # Application constants
```

### Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS 3+
- **UI Components**: Radix UI primitives
- **Animation**: Framer Motion
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod
- **Testing**: Jest + React Testing Library

## AI Providers

The application supports multiple AI providers:

### OpenAI
- Models: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- Get API key: [OpenAI Platform](https://platform.openai.com/)

### Google Gemini
- Models: Gemini Pro, Gemini Pro Vision
- Get API key: [Google AI Studio](https://ai.google.dev/)

### Anthropic Claude
- Models: Claude 3 Opus, Sonnet, Haiku
- Get API key: [Anthropic Console](https://console.anthropic.com/)

### OpenRouter
- Multiple models through unified interface
- Get API key: [OpenRouter](https://openrouter.ai/)

## Privacy & Security

- **No User Accounts**: Session-based usage only
- **Local Storage**: API keys stored securely in browser session
- **No Data Persistence**: Content cleared after session timeout
- **HTTPS Only**: Secure transmission in production
- **API Key Safety**: Keys never logged or stored permanently

## Performance Targets

- Initial page load: < 2 seconds
- Article generation: < 60 seconds
- Export operations: < 5 seconds
- UI responsiveness: 60fps animations

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Architecture Overview

### AI Provider System
- **BaseAIProvider**: Abstract base class with common functionality
- **Provider Implementations**: OpenAI, Gemini, Claude, OpenRouter
- **Provider Factory**: Dynamic provider creation and validation
- **Provider Manager**: Multi-provider management with auto-selection

### Security & API Management
- **Session-based encryption**: XOR encryption for API key storage
- **No persistent storage**: All sensitive data cleared on session end
- **Secure validation**: API key testing without permanent storage
- **Error handling**: Comprehensive error mapping and user-friendly messages

### Content Generation System
- **Category Analysis**: AI-powered content categorization
- **Dynamic Questions**: Category-specific, adaptive questioning
- **Prompt Templates**: Sophisticated templates for each content category
- **Content Structure**: Format-specific article structure guidance

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For questions, issues, or feature requests, please create an issue in the GitHub repository.