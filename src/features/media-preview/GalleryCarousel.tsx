'use client';

import React, { useState } from 'react';
import { GalleryItem } from '@/types/media';
import { ChevronLeft, ChevronRight, Eye, Film, Image as ImageIcon } from 'lucide-react';

interface GalleryCarouselProps {
    items: GalleryItem[];
    title: string;
    onDownloadItem?: (item: GalleryItem) => void;
}

    function getNaturalAspectRatio(item?: GalleryItem): string {
        if (!item) return '4 / 5';
        if (item.width && item.height) {
            return `${item.width} / ${item.height}`;
        }
        if (item.resolution) {
            const match = item.resolution.match(/(\d+)\s*[x×]\s*(\d+)/);
            if (match && parseInt(match[1], 10) > 0 && parseInt(match[2], 10) > 0) {
                return `${match[1]} / ${match[2]}`;
            }
        }
        return '4 / 5';
    }

    export function GalleryCarousel({ items, title }: GalleryCarouselProps) {
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
                <div className="flex flex-col gap-3.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-white/[0.08] dark:bg-zinc-900/30">
                    {/* Header: Title and Navigation Controls */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-zinc-500" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                                Preview ({currentIndex + 1} of {items.length})
                            </span>
                            {currentItem.resolution && (
                                <span className="rounded bg-zinc-200/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    {currentItem.resolution}
                                </span>
                            )}
                        </div>

                        {/* Navigation Arrows */}
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={prev}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                aria-label="Previous slide"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="font-mono text-xs font-medium text-zinc-600 dark:text-zinc-400 px-1">
                                {currentIndex + 1} / {items.length}
                            </span>
                            <button
                                type="button"
                                onClick={next}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                aria-label="Next slide"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                        {/* Main Preview Container with Dynamic Natural Aspect Ratio (4:5, 1:1, etc.) */}
                        <div
                            className="relative w-full mx-auto overflow-hidden rounded-2xl bg-zinc-950 flex items-center justify-center border border-zinc-200/80 shadow-md dark:border-white/[0.08]"
                            style={{
                                aspectRatio: getNaturalAspectRatio(currentItem),
                                maxHeight: '620px',
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={currentItem.thumbnailUrl || currentItem.url}
                                alt={`Slide ${currentIndex + 1}`}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-contain"
                            />

                            {/* Slide Number Badge (Top-Left) */}
                            <div className="absolute top-3 left-3 rounded-md bg-black/75 px-2.5 py-1 font-mono text-xs font-bold text-white shadow-sm backdrop-blur-md">
                                {String(currentIndex + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
                            </div>

                            {/* Media Type Badge (Top-Right) */}
                            <div className="absolute top-3 right-3">
                                {currentItem.type === 'video' ? (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/20 px-2 py-1 text-xs font-semibold text-rose-300 shadow-sm backdrop-blur-md">
                                        <Film className="h-3 w-3" />
                                        <span>VIDEO</span>
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/40 bg-indigo-500/20 px-2 py-1 text-xs font-semibold text-indigo-300 shadow-sm backdrop-blur-md">
                                        <ImageIcon className="h-3 w-3" />
                                        <span>IMAGE</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Thumbnails Filmstrip Strip */}
                        {items.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto py-1 px-0.5">
                                {items.map((item, idx) => (
                                    <button
                                        key={item.id || idx}
                                        type="button"
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`relative h-14 w-12 flex-shrink-0 overflow-hidden rounded-lg border transition-all ${idx === currentIndex
                                                ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-sm'
                                                : 'border-zinc-200/80 opacity-60 hover:opacity-100 dark:border-white/[0.08]'
                                            }`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={item.thumbnailUrl || item.url}
                                            alt={`Thumbnail ${idx + 1}`}
                                            referrerPolicy="no-referrer"
                                            className="h-full w-full object-cover"
                                        />
                                        <span className="absolute bottom-0 inset-x-0 bg-black/70 font-mono text-[9px] text-white text-center py-0.5">
                                            {idx + 1}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    );
}
