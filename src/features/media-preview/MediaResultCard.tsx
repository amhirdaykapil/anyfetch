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
    Volume2,
} from 'lucide-react';
import { MediaResult, MediaFormatOption, GalleryItem } from '@/types/media';
import { getPlatformIcon } from '@/components/PlatformIcons';
import { PLATFORMS_META } from '@/features/platform-detection/detector';
import { GalleryCarousel } from './GalleryCarousel';
import { CarouselSection } from './CarouselSection';
import { DownloadProgressButton } from '@/features/downloader/DownloadProgressButton';

interface MediaResultCardProps {
    result: MediaResult;
    onDownloadStarted?: (format: MediaFormatOption) => void;
}

export function MediaResultCard({ result, onDownloadStarted }: MediaResultCardProps) {
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [imgError, setImgError] = useState(false);
    const [selectedFormatId, setSelectedFormatId] = useState<string>(
        result.formats[0]?.id || ''
    );

    const meta = PLATFORMS_META[result.platform] || PLATFORMS_META.unknown;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(result.originalUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const handleDownload = async (format: MediaFormatOption) => {
        setDownloadingId(format.id);
        setDownloadError(null);
        if (onDownloadStarted) {
            onDownloadStarted(format);
        }

        try {
            // Deduce expected clean filename
            let expectedFilename = `${result.title || 'media_download'}.${format.format}`;
            try {
                const u = new URL(format.downloadUrl, window.location.origin);
                const fn = u.searchParams.get('filename');
                if (fn) expectedFilename = decodeURIComponent(fn);
            } catch {
                // Fallback
            }

            if (format.downloadUrl.startsWith('/api/download')) {
                const res = await fetch(format.downloadUrl, { method: 'GET' });

                if (!res.ok) {
                    let errorMsg = `Server returned HTTP ${res.status}`;
                    try {
                        const json = await res.json();
                        if (json?.error?.message) {
                            errorMsg = json.error.message;
                        }
                    } catch {
                        // Not JSON
                    }
                    setDownloadError(errorMsg);
                    setDownloadingId(null);
                    return;
                }

                // Parse content-disposition header if available
                const disposition = res.headers.get('content-disposition');
                if (disposition && disposition.includes('filename=')) {
                    const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
                    if (match && match[1]) expectedFilename = match[1];
                }

                const blob = await res.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = blobUrl;
                a.download = expectedFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => window.URL.revokeObjectURL(blobUrl), 15000);
            } else {
                const link = document.createElement('a');
                link.href = format.downloadUrl;
                link.download = expectedFilename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err) {
            setDownloadError(`Download failed: ${(err as Error).message}`);
        } finally {
            setTimeout(() => setDownloadingId(null), 1000);
        }
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
                                {
                                    result.thumbnailUrl && !imgError ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={result.thumbnailUrl}
                                            alt={result.title}
                                            referrerPolicy="no-referrer"
                                            onError={() => setImgError(true)}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-500">
                                            {getPlatformIcon(result.platform, { size: 36 })}
                                            <span className="text-xs">Preview unavailable</span>
                                        </div>
                                    )
                                }

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

                            {/* Download Error Banner */}
                            {downloadError && (
                                <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="font-medium">{downloadError}</p>
                                    </div>
                                </div>
                            )}

                            {/* Formats List */}
                                    {
                                        result.formats.length === 0 ? null : (
                                            <div className="space-y-2">
                                                {result.formats.map((format) => {
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
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                                                            {format.label}
                                                                        </span>
                                                                        <span className="rounded bg-zinc-200/60 px-1.5 py-0.2 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                                            {format.quality}
                                                                        </span>
                                                                        {format.hasAudio && (
                                                                            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                                                                <Volume2 className="h-2.5 w-2.5" />
                                                                                <span>Audio</span>
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                                                                        {format.resolution && <span>{format.resolution}</span>}
                                                                        {format.resolution && format.fileSizeFormatted && <span>•</span>}
                                                                        {format.fileSizeFormatted && <span>{format.fileSizeFormatted}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Download Action Button */}
                                                            <div onClick={(e) => e.stopPropagation()}>
                                                                <DownloadProgressButton
                                                                    format={format}
                                                                    defaultFilename={`${result.title || 'media_download'}.${format.format}`}
                                                                    onDownloadStarted={onDownloadStarted}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                    }

                            {/* Optional Separate Thumbnails & Artwork Section */}
                            {result.thumbnails && result.thumbnails.length > 0 && (
                                <div className="mt-5 border-t border-zinc-200/80 pt-4 dark:border-white/[0.08]">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                            Thumbnails & Poster Artwork ({result.thumbnails.length})
                                        </span>
                                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                            Original Master Resolutions
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {result.thumbnails.map((thumb) => {
                                            return (
                                                <div
                                                    key={thumb.id}
                                                    className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-zinc-50/40 p-2.5 transition-all hover:border-zinc-300 dark:border-white/[0.06] dark:bg-zinc-900/20 dark:hover:border-white/[0.12]"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200/60 font-mono text-[10px] font-bold uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                            JPG
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-medium text-zinc-900 dark:text-zinc-200">
                                                                {thumb.label}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                                                {thumb.resolution || thumb.quality}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <DownloadProgressButton
                                                            format={thumb}
                                                            compact
                                                            defaultFilename={`${result.title || 'thumbnail'}_${thumb.resolution || thumb.quality}.${thumb.format}`}
                                                            onDownloadStarted={onDownloadStarted}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Compliance Banner */}
                        {
                            result.complianceNotice && (
                                <div className="mt-4 flex items-start gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3 text-[11px] text-zinc-600 dark:border-white/[0.06] dark:bg-zinc-900/30 dark:text-zinc-400">
                                    <ShieldCheck className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" />
                                    <p className="leading-relaxed">{result.complianceNotice}</p>
                                </div>
                            )
                        }
                    </div>
                </div>

                {/* Dedicated Universal Carousel Section */}
                {result.gallery && result.gallery.length > 0 && (
                    <CarouselSection
                        items={result.gallery}
                        title={result.title}
                        onDownloadStarted={onDownloadStarted}
                    />
                )}
            </div>
        </div>
    );
}
