'use client';

import React, { useState } from 'react';
import {
    Download,
    Copy,
    Check,
    ExternalLink,
    ShieldCheck,
    Film,
    Music,
    Image as ImageIcon,
    Layers,
    AlertCircle,
    Clock,
    Sparkles,
} from 'lucide-react';
import { MediaResult, MediaFormatOption, GalleryItem } from '@/types/media';
import { getPlatformIcon } from '@/components/PlatformIcons';
import { PLATFORMS_META } from '@/features/platform-detection/detector';
import { GalleryCarousel } from './GalleryCarousel';

interface MediaResultCardProps {
    result: MediaResult;
    onDownloadStarted?: (format: MediaFormatOption) => void;
}

export function MediaResultCard({ result, onDownloadStarted }: MediaResultCardProps) {
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [selectedFormatId, setSelectedFormatId] = useState<string>(
        result.formats[0]?.id || ''
    );

    const meta = PLATFORMS_META[result.platform] || PLATFORMS_META.unknown;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(result.originalUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const handleDownload = (format: MediaFormatOption) => {
        setDownloadingId(format.id);
        if (onDownloadStarted) {
            onDownloadStarted(format);
        }

        // Trigger download via hidden anchor
        const link = document.createElement('a');
        link.href = format.downloadUrl;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => setDownloadingId(null), 2500);
    };

    const getMediaIcon = () => {
        switch (result.mediaType) {
            case 'video':
                return <Film className="h-3.5 w-3.5" />;
            case 'audio':
                return <Music className="h-3.5 w-3.5" />;
            case 'gallery':
                return <Layers className="h-3.5 w-3.5" />;
            case 'image':
            default:
                return <ImageIcon className="h-3.5 w-3.5" />;
        }
    };

    return (
        <div className="w-full overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/95 shadow-xl transition-all dark:border-white/[0.08] dark:bg-zinc-950/80 dark:shadow-2xl">
            {/* Top Banner / Platform Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/60 px-5 py-3 dark:border-white/[0.06] dark:bg-zinc-900/40">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200/70 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                        {getPlatformIcon(result.platform, { size: 16 })}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                                {result.platformName}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${meta.badgeColor}`}>
                                {getMediaIcon()}
                                <span className="capitalize">{result.mediaType}</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {result.officialViewUrl && (
                        <a
                            href={result.officialViewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded-lg border border-zinc-200/80 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        >
                            <span>View Original</span>
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={handleCopyLink}
                        className="flex items-center gap-1 rounded-lg border border-zinc-200/80 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        {copiedUrl ? (
                            <>
                                <Check className="h-3 w-3 text-emerald-500" />
                                <span className="text-emerald-500">Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy className="h-3 w-3" />
                                <span>Copy Link</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="p-5 md:p-6">
                <div className="grid gap-6 lg:grid-cols-12">
                    {/* Left Column: Visual Preview */}
                    <div className="lg:col-span-5">
                        {result.gallery && result.gallery.length > 0 ? (
                            <GalleryCarousel
                                items={result.gallery}
                                title={result.title}
                                onDownloadItem={(item) =>
                                    handleDownload({
                                        id: item.id,
                                        label: `Gallery Item (${item.format.toUpperCase()})`,
                                        format: item.format,
                                        quality: 'Original Resolution',
                                        downloadUrl: item.url,
                                    })
                                }
                            />
                        ) : (
                            <div className="group relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-950 dark:border-white/[0.08]">
                                {result.thumbnailUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={result.thumbnailUrl}
                                        alt={result.title}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-500">
                                        {getPlatformIcon(result.platform, { size: 36 })}
                                        <span className="text-xs">Preview unavailable</span>
                                    </div>
                                )}

                                {/* Duration Badge */}
                                {result.durationFormatted && (
                                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded bg-black/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                                        <Clock className="h-3 w-3" />
                                        <span>{result.durationFormatted}</span>
                                    </div>
                                )}

                                {/* Video Play Overlay Cue */}
                                {result.mediaType === 'video' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-xl backdrop-blur transition-transform group-hover:scale-110 dark:bg-black/80 dark:text-white">
                                            <Film className="h-5 w-5" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Author Info */}
                        {result.author && (
                            <div className="mt-3.5 flex items-center gap-2.5">
                                {result.author.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={result.author.avatarUrl}
                                        alt={result.author.name}
                                        className="h-7 w-7 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                        {result.author.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <div className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                                        {result.author.name}
                                    </div>
                                    {result.author.username && (
                                        <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                            {result.author.username}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Title and Available Formats */}
                    <div className="flex flex-col justify-between lg:col-span-7">
                        <div>
                            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                                {result.title}
                            </h3>

                            {result.description && (
                                <p className="mt-1.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                                    {result.description}
                                </p>
                            )}

                            {/* Formats Section Header */}
                            <div className="mt-5 mb-2.5 flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Available Formats & Qualities ({result.formats.length})
                                </span>
                                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                    Select an option to download
                                </span>
                            </div>

                            {/* Formats List */}
                            <div className="space-y-2">
                                {result.formats.map((format) => {
                                    const isDownloading = downloadingId === format.id;
                                    const isSelected = selectedFormatId === format.id;

                                    return (
                                        <div
                                            key={format.id}
                                            onClick={() => setSelectedFormatId(format.id)}
                                            className={`group flex items-center justify-between rounded-xl border p-3 transition-all cursor-pointer ${isSelected
                                                    ? 'border-zinc-900 bg-zinc-50/80 dark:border-zinc-400 dark:bg-zinc-900/60'
                                                    : 'border-zinc-200/80 bg-white hover:border-zinc-300 hover:bg-zinc-50/50 dark:border-white/[0.06] dark:bg-zinc-900/20 dark:hover:border-white/[0.12] dark:hover:bg-zinc-900/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 font-mono text-xs font-bold uppercase text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                                    {format.format}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                                            {format.label}
                                                        </span>
                                                        <span className="rounded bg-zinc-200/60 px-1.5 py-0.2 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                            {format.quality}
                                                        </span>
                                                    </div>

                                                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                                                        {format.resolution && <span>{format.resolution}</span>}
                                                        {format.resolution && format.fileSizeFormatted && <span>•</span>}
                                                        {format.fileSizeFormatted && <span>{format.fileSizeFormatted}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Download Action Button */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(format);
                                                }}
                                                disabled={isDownloading}
                                                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-75 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                                            >
                                                {isDownloading ? (
                                                    <>
                                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                        <span>Saving...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="h-3.5 w-3.5" />
                                                        <span>Download</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Compliance Banner */}
                        {result.complianceNotice && (
                            <div className="mt-4 flex items-start gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 text-[11px] text-zinc-600 dark:border-white/[0.06] dark:bg-zinc-900/30 dark:text-zinc-400">
                                <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" />
                                <p className="leading-relaxed">{result.complianceNotice}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
