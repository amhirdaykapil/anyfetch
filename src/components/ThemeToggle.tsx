'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('anyfetch_theme') || localStorage.getItem('omnifetch_theme');
    const isThemeDark = stored !== 'light';
    setIsDark(isThemeDark);
    if (isThemeDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('anyfetch_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      localStorage.setItem('anyfetch_theme', 'light');
    }
  };

  if (!mounted) {
    return (
      <div className={`h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-800 ${className}`} />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100/50 text-zinc-600 transition-all hover:bg-zinc-200/60 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100 ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  );
}

