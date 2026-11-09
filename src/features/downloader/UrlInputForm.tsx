'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Link2,
  Clipboard,
  X,
  ArrowRight,
  Loader2,
  Check,
  Sparkles,
} from 'lucide-react';
import { PlatformId } from '@/types/media';
import { detectLivePlatform } from '@/features/platform-detection/detector';
import { getPlatformIcon } from '@/components/PlatformIcons';

interface UrlInputFormProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (url: string) => void;
  isLoading: boolean;
  onClear: () => void;
  onPlatformDetected?: (platform: PlatformId) => void;
}

export function UrlInputForm({
  value,
  onChange,
  onSubmit,
  isLoading,
  onClear,
  onPlatformDetected,
}: UrlInputFormProps) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const detected = detectLivePlatform(value);

  useEffect(() => {
    if (onPlatformDetected) {
      onPlatformDetected(detected.id);
    }
  }, [detected.id, onPlatformDetected]);

  // Global keyboard shortcut to focus input (Ctrl+K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement !== inputRef.current)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text.trim());
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // In case browser denies permission, just focus the input
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isLoading) return;
    onSubmit(value.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="group relative flex flex-col items-center rounded-2xl border border-zinc-200/90 bg-white/95 p-2 shadow-2xl shadow-zinc-200/40 backdrop-blur-xl transition-all focus-within:border-zinc-900 focus-within:ring-4 focus-within:ring-zinc-900/5 sm:flex-row dark:border-white/[0.08] dark:bg-zinc-950/80 dark:shadow-black/50 dark:focus-within:border-white/30 dark:focus-within:ring-white/5">
        {/* Left Platform Icon Badge */}
        <div className="hidden sm:flex items-center pl-3 pr-2 text-zinc-400 dark:text-zinc-500">
          {detected.id !== 'unknown' ? (
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${detected.badgeColor}`}
              title={detected.name}
            >
              {getPlatformIcon(detected.id, { size: 16 })}
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <Link2 className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* URL Input */}
        <input
          ref={inputRef}
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste your video, image or post link here..."
          disabled={isLoading}
          required
          autoFocus
          className="h-12 w-full flex-1 bg-transparent px-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none selection:bg-zinc-200 disabled:opacity-50 dark:text-zinc-100 dark:placeholder-zinc-600 dark:selection:bg-zinc-800 sm:h-14 sm:text-base"
        />

        {/* Buttons Right Section */}
        <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto sm:pl-2">
          {/* Clear button if text exists */}
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
              title="Clear input"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Paste button */}
          {!value && (
            <button
              type="button"
              onClick={handlePaste}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-zinc-100/60 px-3 py-2 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-200/70 hover:text-zinc-900 active:scale-95 dark:border-white/[0.08] dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title="Paste from clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Pasted</span>
                </>
              ) : (
                <>
                  <Clipboard className="h-3.5 w-3.5" />
                  <span>Paste</span>
                </>
              )}
            </button>
          )}

          {/* Download Action Button */}
          <button
            type="submit"
            disabled={isLoading || !value.trim()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-zinc-800 active:scale-98 disabled:pointer-events-none disabled:opacity-50 sm:h-12 sm:w-auto sm:px-6 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:shadow-white/5"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing Media...</span>
              </>
            ) : (
              <>
                <span>Download</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

