import React from 'react';
import Link from 'next/link';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BrandLogo({ className = '', size = 'md' }: BrandLogoProps) {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 36 : 28;
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <Link href="/" className={`group flex items-center gap-2.5 transition-opacity hover:opacity-90 ${className}`}>
      <div className="relative flex items-center justify-center">
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-300 group-hover:scale-105"
        >
          {/* Subtle Outer Ring */}
          <rect
            x="1"
            y="1"
            width="30"
            height="30"
            rx="8"
            className="stroke-zinc-800 dark:stroke-zinc-700/60"
            strokeWidth="1.5"
          />
          {/* Ambient Fill */}
          <rect
            x="2"
            y="2"
            width="28"
            height="28"
            rx="7"
            className="fill-zinc-100 dark:fill-zinc-900"
          />
          {/* Primary Emblem - Interlocking Downward Media Stream */}
          <path
            d="M9 11L16 18L23 11"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-900 dark:text-zinc-100"
          />
          <path
            d="M12 16L16 20L20 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-400 dark:text-zinc-400"
          />
          <circle
            cx="16"
            cy="7.5"
            r="1.75"
            className="fill-zinc-900 dark:fill-zinc-100"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 ${textSize}`}>
            OmniFetch
          </span>
          <span className="rounded-full bg-zinc-200/80 px-1.5 py-0.2 text-[10px] font-medium tracking-wide uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            v2.4
          </span>
        </div>
      </div>
    </Link>
  );
}

