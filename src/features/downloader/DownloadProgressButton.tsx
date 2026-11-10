'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, Check, RotateCcw, X, Loader2 } from 'lucide-react';
import { MediaFormatOption } from '@/types/media';
import { formatBytes } from '@/lib/utils';

export type DownloadState = 'idle' | 'preparing' | 'downloading' | 'completed' | 'failed' | 'cancelled';

interface DownloadProgressButtonProps {
    format: MediaFormatOption;
    defaultFilename: string;
    onDownloadStarted?: (format: MediaFormatOption) => void;
    onDownloadCompleted?: (format: MediaFormatOption) => void;
    className?: string;
    compact?: boolean;
}

function parseFormattedSize(sizeStr?: string): number | null {
    if (!sizeStr) return null;
    const match = sizeStr.trim().match(/^([\d.]+)\s*([KMGTP]?B)$/i);
    if (!match) return null;
    const num = parseFloat(match[1]);
    if (isNaN(num)) return null;
    const unit = match[2].toUpperCase();
    switch (unit) {
        case 'B': return num;
        case 'KB': return Math.round(num * 1024);
        case 'MB': return Math.round(num * 1024 * 1024);
        case 'GB': return Math.round(num * 1024 * 1024 * 1024);
        default: return null;
    }
}

export function DownloadProgressButton({
    format,
    defaultFilename,
    onDownloadStarted,
    onDownloadCompleted,
    className = '',
    compact = false,
}: DownloadProgressButtonProps) {
    const [downloadState, setDownloadState] = useState<DownloadState>('idle');
    const [progress, setProgress] = useState<number | null>(null);
    const [receivedBytes, setReceivedBytes] = useState(0);
    const [totalBytes, setTotalBytes] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    const receivedRef = useRef(0);
    const totalRef = useRef<number | null>(null);
    const animFrameRef = useRef<number | null>(null);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (animFrameRef.current !== null) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, []);

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (animFrameRef.current !== null) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        setDownloadState('cancelled');
        setTimeout(() => {
            setDownloadState('idle');
            setProgress(null);
            setReceivedBytes(0);
            setTotalBytes(null);
            receivedRef.current = 0;
            totalRef.current = null;
        }, 2000);
    };

    const startDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // Prevent duplicate triggers
        if (downloadState === 'downloading' || downloadState === 'preparing') {
            return;
        }

        setDownloadState('preparing');
        setReceivedBytes(0);
        setProgress(null);
        setErrorMessage(null);
        receivedRef.current = 0;

        // Initial total determination from format prop or URL query param
        let initialTotal: number | null = null;
        if (typeof format.fileSize === 'number' && format.fileSize > 0) {
            initialTotal = format.fileSize;
        } else {
            initialTotal = parseFormattedSize(format.fileSizeFormatted);
        }

        if (!initialTotal) {
            try {
                const u = new URL(format.downloadUrl, window.location.origin);
                const s = u.searchParams.get('size') || u.searchParams.get('filesize');
                if (s && parseInt(s, 10) > 0) {
                    initialTotal = parseInt(s, 10);
                }
            } catch {
                // Fallback
            }
        }

        totalRef.current = initialTotal;
        setTotalBytes(initialTotal);
        if (initialTotal && initialTotal > 0) {
            setProgress(0);
        }

        if (onDownloadStarted) {
            onDownloadStarted(format);
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Deduce initial expected filename
        let expectedFilename = defaultFilename;
        try {
            const u = new URL(format.downloadUrl, window.location.origin);
            const fn = u.searchParams.get('filename');
            if (fn) expectedFilename = decodeURIComponent(fn);
        } catch {
            // Fallback
        }

        try {
            const res = await fetch(format.downloadUrl, {
                method: 'GET',
                signal: abortController.signal,
            });

            if (!res.ok) {
                let errMsg = `HTTP ${res.status}`;
                try {
                    const json = await res.json();
                    if (json?.error?.message) {
                        errMsg = json.error.message;
                    }
                } catch {
                    // Ignore
                }
                throw new Error(errMsg);
            }

            // Read Content-Disposition for final filename
            const disposition = res.headers.get('content-disposition');
            if (disposition && disposition.includes('filename*=')) {
                const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
                if (match && match[1]) {
                    try {
                        expectedFilename = decodeURIComponent(match[1]);
                    } catch {
                        // Keep previous
                    }
                }
            } else if (disposition && disposition.includes('filename=')) {
                const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
                if (match && match[1]) {
                    expectedFilename = match[1];
                }
            }

            // Check all possible total size headers (X-Total-Bytes, X-Content-Length, Content-Length)
            const contentLengthHeader =
                res.headers.get('x-total-bytes') ||
                res.headers.get('x-content-length') ||
                res.headers.get('content-length');
            const headerTotal = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;
            if (headerTotal && !isNaN(headerTotal) && headerTotal > 0) {
                totalRef.current = headerTotal;
                setTotalBytes(headerTotal);
            }

            const contentType = res.headers.get('content-type') || 'application/octet-stream';

            if (!res.body) {
                throw new Error('Response body stream is unavailable.');
            }

            setDownloadState('downloading');

            const reader = res.body.getReader();
            const chunks: Uint8Array[] = [];

            // Schedule 60 FPS UI updates using requestAnimationFrame to prevent event-loop freezing
            const scheduleUpdate = () => {
                if (animFrameRef.current !== null) return;
                animFrameRef.current = requestAnimationFrame(() => {
                    animFrameRef.current = null;
                    const currentReceived = receivedRef.current;
                    setReceivedBytes(currentReceived);

                    const curTotal = totalRef.current;
                    if (curTotal && curTotal > 0) {
                        // progress = (downloadedBytes / totalBytes) * 100
                        const pct = Math.min(99, Math.max(0, Math.floor((currentReceived / curTotal) * 100)));
                        setProgress(pct);
                    }
                });
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                if (value) {
                    chunks.push(value);
                    receivedRef.current += value.length;
                    scheduleUpdate();
                }
            }

            // Stream successfully closed and complete
            if (animFrameRef.current !== null) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }

            const finalReceived = receivedRef.current;
            setReceivedBytes(finalReceived);

            // Only mark 100% when stream has closed successfully
            setProgress(100);
            setDownloadState('completed');

            const blob = new Blob(chunks as BlobPart[], { type: contentType });
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = expectedFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);

            if (onDownloadCompleted) {
                onDownloadCompleted(format);
            }

            // Reset to idle after 3.5 seconds
            setTimeout(() => {
                setDownloadState('idle');
                setProgress(null);
                setReceivedBytes(0);
                setTotalBytes(null);
                receivedRef.current = 0;
                totalRef.current = null;
            }, 3500);
        } catch (err) {
            if (animFrameRef.current !== null) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = null;
            }
            if ((err as Error).name === 'AbortError') {
                setDownloadState('cancelled');
                setTimeout(() => {
                    setDownloadState('idle');
                    setProgress(null);
                    setReceivedBytes(0);
                    setTotalBytes(null);
                    receivedRef.current = 0;
                    totalRef.current = null;
                }, 2000);
            } else {
                setDownloadState('failed');
                setErrorMessage((err as Error).message || 'Download failed');
            }
        } finally {
            abortControllerRef.current = null;
        }
    };

    const isStreaming = downloadState === 'downloading' || downloadState === 'preparing';

    return (
            <div className={`relative inline-flex flex-col items-end ${compact ? '' : 'min-w-[190px]'}`}>
      <button
        type="button"
        onClick={startDownload}
        disabled={isStreaming}
        className={`group relative overflow-hidden rounded-lg font-medium transition-all duration-200 select-none ${
          compact ? 'h-7 min-w-[130px] text-xs' : 'h-8.5 min-w-[180px] text-xs'
        } ${
          downloadState === 'completed'
            ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
            : downloadState === 'failed'
            ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
            : downloadState === 'cancelled'
            ? 'bg-zinc-700 text-white dark:bg-zinc-700'
            : isStreaming
            ? 'bg-zinc-950 text-white border border-zinc-700/80 shadow-inner dark:bg-zinc-950 dark:border-zinc-700'
            : 'bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'
        } ${className}`}
        title={errorMessage || undefined}
      >
                {/* Animated Progress Fill Bar - fill width corresponds EXACTLY to actual progress percentage */}
                {isStreaming && (
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 transition-all duration-100 ease-linear"
                        style={{
                            width: progress !== null ? `${progress}%` : '100%',
                            opacity: progress !== null ? 1 : 0.35,
                        }}
                    >
                        {/* Luminous leading edge bead */}
                        {progress !== null && (
                            <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_#ffffff]" />
                        )}
                        {/* Subtle animated shine while downloading */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-sweep" />
                    </div>
                )}

                {/* Content Layer */}
                <span className="relative z-10 flex h-full w-full items-center justify-center px-3 whitespace-nowrap">
                    {downloadState === 'idle' && (
                        <span className="flex items-center gap-1.5">
                            <Download className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
                            <span>Download</span>
                        </span>
                    )}

                    {downloadState === 'preparing' && (
                        <span className="flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                            <span>Connecting...</span>
                        </span>
                    )}

                    {downloadState === 'downloading' && (
                        <span className="flex w-full items-center justify-between gap-1.5">
                            {progress !== null && totalBytes ? (
                                <>
                                    <span className="font-mono text-xs font-bold text-white tabular-nums drop-shadow-sm">
                                        {progress}%
                                    </span>
                                    <span className="text-zinc-400 text-[10px]">|</span>
                                    <span className="font-mono text-[11px] font-medium text-zinc-100 tabular-nums drop-shadow-sm">
                                        {formatBytes(receivedBytes)} / {formatBytes(totalBytes)}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="font-mono text-[11px] font-semibold text-white tabular-nums drop-shadow-sm">
                                        {formatBytes(receivedBytes)}
                                    </span>
                                    <span className="text-zinc-400 text-[10px]">|</span>
                                    <span className="font-mono text-[11px] text-zinc-200">
                                        Streaming...
                                    </span>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="ml-1 rounded-full p-0.5 text-zinc-300 transition-colors hover:bg-white/20 hover:text-white"
                                title="Cancel download"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    )}

                    {downloadState === 'completed' && (
                        <span className="flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5 animate-in zoom-in-75 duration-200" />
                            <span>Downloaded</span>
                        </span>
                    )}

                    {downloadState === 'failed' && (
                        <span className="flex items-center gap-1.5">
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Retry</span>
                        </span>
                    )}

                    {downloadState === 'cancelled' && (
                        <span>Cancelled</span>
                    )}
                </span>
            </button>

            {/* Real-time Subtitle indicator under button */}
            {isStreaming && (
                <span className="mt-1 font-mono text-[9px] text-zinc-500 dark:text-zinc-400">
                    {formatBytes(receivedBytes)}
                    {totalBytes ? ` of ${formatBytes(totalBytes)}` : ' received'}
                </span>
            )}
        </div>
    );
}
