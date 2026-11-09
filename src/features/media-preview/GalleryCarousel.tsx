'use client';

import React, { useState } from 'react';
import { GalleryItem } from '@/types/media';
import { ChevronLeft, ChevronRight, Download, Eye, ExternalLink } from 'lucide-react';

interface GalleryCarouselProps {
    items: GalleryItem[];
    title: string;
    onDownloadItem?: (item: GalleryItem) => void;
}

export function GalleryCarousel({ items, title, onDownloadItem }: GalleryCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!items || items.length === 0) return null;

    const currentItem = items[currentIndex];

    const prev = () => {
        setCurrentIndex((c) => (c === 0 ? items.length - 1 : c - 1));
    };

    const next = () => {
        setCurrentIndex((c) => (c === items.length - 1 ? 0 : c + 1));
    };

    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-white/[0.08] dark:bg-zinc-900/30">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-zinc-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        Media Gallery ({currentIndex + 1} of {items.length})
                    </span>
                </div>

                {/* Thumbnail Dots / Counter */}
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={prev}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={next}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        aria-label="Next image"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Main Preview */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={currentItem.thumbnailUrl || currentItem.url}
                    alt={`Gallery item ${currentIndex + 1}`}
                    className="h-full w-full object-contain"
                />

                <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button
                        type="button"
                        onClick={() => onDownloadItem && onDownloadItem(currentItem)}
                        className="flex items-center gap-1.5 rounded-lg bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Item</span>
                </button>
            </div>
        </div>

      {/* Thumbnails strip */ }
    {
        items.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
                {items.map((item, idx) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border transition-all ${idx === currentIndex
                                ? 'border-zinc-900 ring-2 ring-zinc-900/20 dark:border-white dark:ring-white/20'
                                : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={item.thumbnailUrl || item.url}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    </button>
                ))}
            </div>
        )
    }
    </div >
  );
}

