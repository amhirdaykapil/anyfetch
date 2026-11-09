'use client';

import React from 'react';
import { PlatformId } from '@/types/media';
import { getPlatformIcon } from '@/components/PlatformIcons';
import { PLATFORMS_META } from '@/features/platform-detection/detector';

interface PlatformPillsProps {
  activePlatform?: PlatformId;
  onSelectPlatform?: (platform: PlatformId) => void;
}

const ORDERED_PLATFORMS: PlatformId[] = [
  'youtube',
  'instagram',
  'pinterest',
  'tiktok',
  'twitter',
  'reddit',
  'threads',
  'facebook',
  'direct',
];

export function PlatformPills({ activePlatform, onSelectPlatform }: PlatformPillsProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
        <span>Supported Platforms & Direct Feeds</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {ORDERED_PLATFORMS.map((id) => {
          const meta = PLATFORMS_META[id];
          const isActive = activePlatform === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectPlatform && onSelectPlatform(id)}
              className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'border-zinc-200/80 bg-zinc-50/60 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.06] dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-white/[0.12] dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200'
              }`}
            >
              <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? '' : 'opacity-80'}`}>
                {getPlatformIcon(id, { size: 14 })}
              </span>
              <span>{meta.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

