'use client';

import React, { useState } from 'react';
import {
    Layers,
    Archive,
    Film,
    Image as ImageIcon,
    Loader2,
    Check,
    AlertCircle,
    Volume2,
} from 'lucide-react';
import JSZip from 'jszip';
import { GalleryItem, MediaFormatOption } from '@/types/media';
import { DownloadProgressButton } from '@/features/downloader/DownloadProgressButton';
import { sanitizeFilename } from '@/lib/utils';

interface CarouselSectionProps {
    items: GalleryItem[];
    title: string;
    onDownloadStarted?: (format: MediaFormatOption) => void;
}

export function CarouselSection({ items, title, onDownloadStarted }: CarouselSectionProps) {
    const [zipStatus, setZipStatus] = useState<'idle' | 'downloading' | 'zipping' | 'completed' | 'error'>('idle');
    const [zipProgress, setZipProgress] = useState<number>(0);
    const [zipStatusText, setZipStatusText] = useState<string>('');
    const [zipError, setZipError] = useState<string | null>(null);

    const handleDownloadAllZip = async () => {
        if (zipStatus === 'downloading' || zipStatus === 'zipping') return;

        setZipStatus('downloading');
        setZipProgress(0);
        setZipError(null);
        setZipStatusText(`Preparing 0/${items.length}...`);

        try {
            const zip = new JSZip();
            const total = items.length;

            for (let idx = 0; idx < total; idx++) {
                const item = items[idx];
                const slideNum = String(item.position || idx + 1).padStart(2, '0');
                const ext = item.format || (item.type === 'video' ? 'mp4' : 'jpg');
                const filename = `OmniFetch_Slide_${slideNum}.${ext}`;

                setZipStatusText(`Downloading ${idx + 1}/${total} (${Math.round(((idx) / total) * 90)}%)...`);

                const res = await fetch(item.downloadUrl);
                if (!res.ok) {
                    throw new Error(`Failed to download slide ${slideNum} (HTTP ${res.status})`);
                }

                const blob = await res.blob();
                zip.file(filename, blob);

                const currentProgress = Math.round(((idx + 1) / total) * 90);
                setZipProgress(currentProgress);
            }

            setZipStatus('zipping');
            setZipStatusText('Packaging ZIP archive...');

            const zipBlob = await zip.generateAsync(
                {
                    type: 'blob',
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 },
                },
                (metadata) => {
                    const packagingPct = 90 + Math.round(metadata.percent * 0.1);
                    setZipProgress(packagingPct);
                }
            );

            const safeBaseTitle = sanitizeFilename(title.substring(0, 45), 'OmniFetch_Carousel');
            const zipFilename = `${safeBaseTitle}_${total}_Slides.zip`;

            const blobUrl = window.URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = zipFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);

            setZipStatus('completed');
            setZipProgress(100);
            setZipStatusText('ZIP Downloaded');

            setTimeout(() => {
                setZipStatus('idle');
                setZipProgress(0);
                setZipStatusText('');
            }, 4000);
        } catch (err) {
            setZipStatus('error');
            setZipError((err as Error).message || 'Failed to generate ZIP archive');
            setTimeout(() => {
                setZipStatus('idle');
                setZipError(null);
            }, 5000);
        }
    };

    if (!items || items.length === 0) return null;

    return (
        <div className="mt-8 border-t border-zinc-200/80 pt-6 dark:border-white/[0.08]">
            {/* Header: Section Title and Download All (ZIP) Action */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400">
                        <Layers className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                                Carousel Content
                            </h4>
                            <span className="inline-flex items-center rounded-full bg-zinc-200/80 px-2.5 py-0.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                {items.length} {items.length === 1 ? 'item' : 'items'}
                            </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Download individual slides in master quality or save the entire carousel as a ZIP archive
                        </p>
                    </div>
                </div>

                {/* Download All (ZIP Archive) Button */}
                <div className="flex flex-col items-end">
                    <button
                        type="button"
                        onClick={handleDownloadAllZip}
                        disabled={zipStatus === 'downloading' || zipStatus === 'zipping'}
                        className={`group relative overflow-hidden rounded-xl px-4 py-2 text-xs font-semibold shadow-md transition-all select-none ${
                            zipStatus === 'completed'
                                ? 'bg-emerald-600 text-white'
                                : zipStatus === 'error'
                                ? 'bg-rose-600 text-white'
                                : zipStatus === 'downloading' || zipStatus === 'zipping'
                                ? 'bg-zinc-900 text-white border border-zinc-700/80'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 active:scale-95 shadow-blue-500/20'
                        }`}
                    >
                        {/* Progress Bar Fill for ZIP Download */}
                        {(zipStatus === 'downloading' || zipStatus === 'zipping') && (
                            <div
                                className="absolute inset-y-0 left-0 bg-blue-500/40 transition-all duration-150 ease-out"
                                style={{ width: `${Math.max(5, zipProgress)}%` }}
                            >
                                <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_#ffffff]" />
                            </div>
                        )}

                        <span className="relative z-10 flex items-center gap-2">
                            {zipStatus === 'idle' && (
                                <>
                                    <Archive className="h-4 w-4 transition-transform group-hover:scale-110" />
                                    <span>Download All ({items.length} Slides ZIP)</span>
                                </>
                            )}
                            {(zipStatus === 'downloading' || zipStatus === 'zipping') && (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                                    <span className="font-mono">{zipStatusText}</span>
                                </>
                            )}
                            {zipStatus === 'completed' && (
                                <>
                                    <Check className="h-4 w-4" />
                                    <span>{zipStatusText}</span>
                                </>
                            )}
                            {zipStatus === 'error' && (
                                <>
                                    <AlertCircle className="h-4 w-4" />
                                    <span>ZIP Failed - Retry</span>
                                </>
                            )}
                        </span>
                    </button>
                    {zipError && (
                        <span className="mt-1 text-[10px] text-rose-500">{zipError}</span>
                    )}
                </div>
            </div>

            {/* Carousel Items Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {items.map((item, idx) => {
                    const slideNum = String(item.position || idx + 1).padStart(2, '0');
                    const ext = item.format || (item.type === 'video' ? 'mp4' : 'jpg');
                    const defaultFilename = `OmniFetch_Slide_${slideNum}.${ext}`;

                    // Format option adapter for individual DownloadProgressButton
                    const formatOption: MediaFormatOption = {
                        id: item.id || `carousel-slide-${slideNum}`,
                        label: `Slide ${slideNum} (${ext.toUpperCase()})`,
                        format: ext,
                        quality: item.resolution || 'Original Resolution',
                        resolution: item.resolution,
                        downloadUrl: item.downloadUrl,
                        fileSize: item.fileSize,
                        fileSizeFormatted: item.fileSizeFormatted,
                        hasAudio: item.hasAudio,
                        category: item.type,
                        sourceType: item.sourceType,
                    };

                    return (
                        <div
                            key={item.id || idx}
                            className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm transition-all hover:border-zinc-300 hover:shadow-md dark:border-white/[0.08] dark:bg-zinc-900/40 dark:hover:border-white/[0.16] dark:hover:bg-zinc-900/70"
                        >
                            {/* Slide Visual Preview */}
                            <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-950">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={item.thumbnailUrl || item.url}
                                    alt={`Slide ${slideNum}`}
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />

                                {/* Slide Number Badge (Top-Left) */}
                                <div className="absolute top-2.5 left-2.5 rounded-md bg-black/75 px-2 py-0.5 font-mono text-[11px] font-bold text-white shadow-sm backdrop-blur-md">
                                    {slideNum}
                                </div>

                                {/* Media Type Badge (Top-Right) */}
                                <div className="absolute top-2.5 right-2.5">
                                    {item.type === 'video' ? (
                                        <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300 shadow-sm backdrop-blur-md">
                                            <Film className="h-3 w-3" />
                                            <span>VIDEO</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/40 bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 shadow-sm backdrop-blur-md">
                                            <ImageIcon className="h-3 w-3" />
                                            <span>IMAGE</span>
                                        </span>
                                    )}
                                </div>

                                {/* Video Play Cue Overlay */}
                                {item.type === 'video' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg backdrop-blur">
                                            <Film className="h-4 w-4" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Slide Info & Download Action */}
                            <div className="flex flex-1 flex-col justify-between p-3">
                                <div>
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                                            Slide {slideNum}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                {ext}
                                            </span>
                                            {item.hasAudio && (
                                                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                                    <Volume2 className="h-2.5 w-2.5" />
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                                        {item.resolution ? (
                                            <span>{item.resolution}</span>
                                        ) : (
                                            <span>Original Quality</span>
                                        )}
                                        {item.fileSizeFormatted && <span>• {item.fileSizeFormatted}</span>}
                                    </div>
                                </div>

                                {/* Individual Download Progress Button */}
                                <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-white/[0.06] flex justify-end">
                                    <DownloadProgressButton
                                        format={formatOption}
                                        compact
                                        defaultFilename={defaultFilename}
                                        onDownloadStarted={onDownloadStarted}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

