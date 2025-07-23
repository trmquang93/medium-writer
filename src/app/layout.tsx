import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionStatus } from '@/components/ui/SessionStatus';
import { Navigation } from '@/components/ui/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Medium AI Writing Assistant',
  description: 'Transform your ideas into publication-ready Medium articles with AI',
  keywords: [
    'AI writing assistant',
    'Medium articles',
    'content generation',
    'writing tool',
  ],
  authors: [{ name: 'Medium AI Assistant Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#667eea',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <Navigation />
          <main className="relative">
            {children}
          </main>
          <SessionStatus />
        </div>
      </body>
    </html>
  );
}