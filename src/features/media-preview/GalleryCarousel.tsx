'use client';

import React, { useState } from 'react';
import { GalleryItem } from '@/types/media';
import { ChevronLeft, ChevronRight, Eye, Download, Check } from 'lucide-react';
import { DownloadProgressButton } from '@/features/downloader/DownloadProgressButton';

interface GalleryCarouselProps {
    items: GalleryItem[];
    title: string;
    onDownloadItem?: (item: GalleryItem) => void;
}

export function GalleryCarousel({ items, title, onDownloadItem }: GalleryCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [downloadAllDone, setDownloadAllDone] = useState(false);

    if (!items || items.length === 0) return null;

    const currentItem = items[currentIndex];

    const prev = () => {
        setCurrentIndex((c) => (c === 0 ? items.length - 1 : c - 1));
    };

    const next = () => {
        setCurrentIndex((c) => (c === items.length - 1 ? 0 : c + 1));
    };

    const handleDownloadAll = async () => {
        if (isDownloadingAll) return;
        setIsDownloadingAll(true);
        setDownloadAllDone(false);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const dlUrl = item.url.startsWith('/api/download')
                ? item.url
                : `/api/download?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(
                    `${title || 'gallery'}_item_${i + 1}.${item.format}`
                )}`;

            const link = document.createElement('a');
            link.href = dlUrl;
            link.download = `${title || 'gallery'}_item_${i + 1}.${item.format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Stagger slightly so browser accepts multiple downloads without blocking
            if (i < items.length - 1) {
                await new Promise((r) => setTimeout(r, 800));
            }
        }

        setIsDownloadingAll(false);
        setDownloadAllDone(true);
        setTimeout(() => setDownloadAllDone(false), 3000);
    };

    const downloadUrl = currentItem.url.startsWith('/api/download')
        ? currentItem.url
        : `/api/download?url=${encodeURIComponent(currentItem.url)}&filename=${encodeURIComponent(
            `${title || 'gallery_item'}_${currentIndex + 1}.${currentItem.format}`
        )}`;

    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-white/[0.08] dark:bg-zinc-900/30">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-zinc-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        Media Gallery ({currentIndex + 1} of {items.length})
                    </span>
                </div>

                    <div className="flex items-center gap-2">
                        {/* Download All Button for Multi-Item Carousels */}
                        {items.length > 1 && (
                            <button
                                type="button"
                                onClick={handleDownloadAll}
                                disabled={isDownloadingAll}
                                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium shadow-sm transition-all select-none ${downloadAllDone
                                        ? 'border-emerald-600 bg-emerald-600 text-white'
                                        : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
                                    }`}
                                title="Download all media items in this carousel"
                            >
                                {downloadAllDone ? (
                                    <>
                                        <Check className="h-3 w-3" />
                                        <span>All Saved</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-3 w-3" />
                                        <span>
                                            {isDownloadingAll ? 'Saving...' : `Download All (${items.length})`}
                                        </span>
                                    </>
                                )}
                            </button>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-1">
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
                </div>

                {/* Main Preview */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={currentItem.thumbnailUrl || currentItem.url}
                        alt={`Gallery item ${currentIndex + 1}`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain"
                    />

                    <div className="absolute bottom-3 right-3 flex items-center gap-2 shadow-lg">
                        <DownloadProgressButton
                            key={currentItem.id}
                            format={{
                                id: currentItem.id,
                                label: `Item ${currentIndex + 1} (${currentItem.format.toUpperCase()})`,
                                format: currentItem.format,
                                quality: currentItem.resolution || 'Original',
                                downloadUrl,
                                sourceType: currentItem.sourceType,
                            }}
                            compact
                            defaultFilename={`${title || 'gallery_item'}_${currentIndex + 1}.${currentItem.format}`}
                            onDownloadStarted={() => onDownloadItem && onDownloadItem(currentItem)}
                        />
                    </div>
                </div>

                {/* Thumbnails strip */}
                {items.length > 1 && (
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
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>
            );
}
