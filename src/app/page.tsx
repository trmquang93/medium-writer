'use client';

import { motion } from 'framer-motion';
import { PenTool, Sparkles, FileText, Settings } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <h1 className="text-6xl font-bold text-gradient mb-6">
          Medium AI Writing Assistant
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
          Transform your ideas into publication-ready Medium articles with the power of AI. 
          Generate high-quality content across multiple categories in minutes, not hours.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg shadow-lg"
        >
          Start Writing with AI
        </motion.button>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <FeatureCard
          icon={<PenTool className="w-8 h-8" />}
          title="Intelligent Writing"
          description="AI analyzes your ideas and generates structured, engaging content"
        />
        <FeatureCard
          icon={<Sparkles className="w-8 h-8" />}
          title="5 Content Categories"
          description="Technology, Business, Personal Development, Lifestyle, Current Affairs"
        />
        <FeatureCard
          icon={<FileText className="w-8 h-8" />}
          title="Multiple Formats"
          description="Export to Markdown, HTML, plain text, or copy to clipboard"
        />
        <FeatureCard
          icon={<Settings className="w-8 h-8" />}
          title="Multi-Provider AI"
          description="Support for OpenAI, Gemini, Claude, and OpenRouter"
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20"
      >
        <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          <ProcessStep
            step="1"
            title="Share Your Idea"
            description="Enter your article topic or rough idea"
          />
          <ProcessStep
            step="2"
            title="AI Analysis"
            description="System categorizes and asks clarifying questions"
          />
          <ProcessStep
            step="3"
            title="Content Generation"
            description="AI creates a complete, structured article"
          />
          <ProcessStep
            step="4"
            title="Edit & Export"
            description="Refine content and export in your preferred format"
          />
        </div>
      </motion.div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20 text-center"
    >
      <div className="text-primary mb-4 flex justify-center">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{description}</p>
    </motion.div>
  );
}

function ProcessStep({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
        {step}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{description}</p>
    </div>
  );
}