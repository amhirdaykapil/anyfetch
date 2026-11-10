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

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setDownloadState('cancelled');
    setTimeout(() => {
      setDownloadState('idle');
      setProgress(null);
      setReceivedBytes(0);
      setTotalBytes(null);
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
    setErrorMessage(null);

    // Initial total determination from format prop
    const initialTotal =
      typeof format.fileSize === 'number' && format.fileSize > 0
        ? format.fileSize
        : parseFormattedSize(format.fileSizeFormatted);
    setTotalBytes(initialTotal);
    setProgress(initialTotal ? 1 : 5);

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

      // Check all possible total size headers
      const contentLengthHeader =
        res.headers.get('x-total-bytes') ||
        res.headers.get('x-content-length') ||
        res.headers.get('content-length');
      const headerTotal = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;
      let effectiveTotal = initialTotal;
      if (headerTotal && !isNaN(headerTotal) && headerTotal > 0) {
        effectiveTotal = headerTotal;
        setTotalBytes(headerTotal);
      }

      const contentType = res.headers.get('content-type') || 'application/octet-stream';

      if (!res.body) {
        throw new Error('Response body stream is unavailable.');
      }

      setDownloadState('downloading');

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        if (value) {
          chunks.push(value);
          received += value.length;
          setReceivedBytes(received);

          if (effectiveTotal && effectiveTotal > 0) {
            const pct = Math.min(99, Math.max(1, Math.round((received / effectiveTotal) * 100)));
            setProgress(pct);
          } else {
            // Asymptotic curve: visibly advances with every incoming chunk from 8% towards 95%
            const estimatedPct = Math.min(
              95,
              Math.max(8, Math.round((1 - Math.exp(-received / (3.5 * 1024 * 1024))) * 95))
            );
            setProgress(estimatedPct);
          }
        }
      }

      // Download complete
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
      }, 3500);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setDownloadState('cancelled');
        setTimeout(() => {
          setDownloadState('idle');
          setProgress(null);
          setReceivedBytes(0);
          setTotalBytes(null);
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
    <div className={`relative inline-flex flex-col items-end ${compact ? '' : 'min-w-[140px]'}`}>
      <button
        type="button"
        onClick={startDownload}
        disabled={isStreaming}
        className={`group relative overflow-hidden rounded-lg font-medium transition-all duration-200 select-none ${
          compact ? 'h-7 min-w-[110px] text-xs' : 'h-8 min-w-[136px] text-xs'
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
        {/* Animated Progress Fill Bar */}
        {isStreaming && (
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 transition-all duration-150 ease-out"
            style={{
              width: `${progress ?? 5}%`,
            }}
          >
            {/* Luminous leading edge line */}
            <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_#ffffff]" />
            {/* Shimmer sweep animation across the filled area */}
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
              <span className="font-mono text-[11px] font-bold tabular-nums text-white drop-shadow">
                {progress ?? 0}%
              </span>
              <span className="font-mono text-[10px] text-zinc-300 drop-shadow">
                {formatBytes(receivedBytes)}
              </span>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full p-0.5 text-zinc-300 transition-colors hover:bg-white/20 hover:text-white"
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
          {totalBytes ? ` / ${formatBytes(totalBytes)}` : ' streamed'}
        </span>
      )}
    </div>
  );
}
