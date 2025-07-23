'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Edit3, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  className?: string;
}

const navigationItems = [
  {
    name: 'Home',
    href: '/',
    icon: Home,
    description: 'Return to homepage'
  },
  {
    name: 'Write',
    href: '/write',
    icon: Edit3,
    description: 'Create article with AI'
  },
];

export function Navigation({ className }: NavigationProps) {
  const pathname = usePathname();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'sticky top-0 z-50 w-full border-b border-white/10',
        'bg-white/70 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60',
        'dark:bg-slate-950/70 dark:backdrop-blur-sm dark:supports-[backdrop-filter]:bg-slate-950/60',
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center space-x-2"
          >
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-40 transition-opacity" />
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Medium AI
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 -mt-1">
                  Writing Assistant
                </p>
              </div>
            </Link>
          </motion.div>

          {/* Navigation Items */}
          <nav className="flex items-center space-x-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.href}
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'relative flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                      'hover:bg-white/80 hover:shadow-sm dark:hover:bg-slate-800/80',
                      isActive
                        ? 'bg-white/90 text-blue-600 shadow-sm dark:bg-slate-800/90 dark:text-blue-400'
                        : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                    )}
                    title={item.description}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-xl border border-blue-200/50 dark:border-blue-800/50"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <Icon className={cn(
                      'h-4 w-4 relative z-10',
                      isActive && 'text-blue-600 dark:text-blue-400'
                    )} />
                    <span className="relative z-10 hidden sm:inline">
                      {item.name}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Settings/Status Area */}
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                'text-slate-600 hover:text-slate-900 hover:bg-white/80 hover:shadow-sm',
                'dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/80'
              )}
              title="Settings & API Keys"
              onClick={() => {
                // This could trigger a settings modal or navigate to settings
                console.log('Settings clicked - implement settings modal');
              }}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline">Settings</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}