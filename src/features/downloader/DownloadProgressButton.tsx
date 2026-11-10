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

    // If currently downloading, do not duplicate
    if (downloadState === 'downloading' || downloadState === 'preparing') {
      return;
    }

    setDownloadState('preparing');
    setProgress(null);
    setReceivedBytes(0);
    setTotalBytes(null);
    setErrorMessage(null);

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

      const contentLengthHeader = res.headers.get('content-length');
      const total = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;
      if (total && !isNaN(total) && total > 0) {
        setTotalBytes(total);
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

          if (total && total > 0) {
            const pct = Math.min(99, Math.round((received / total) * 100));
            setProgress(pct);
          }
        }
      }

      // Download completely finished
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
        }, 2000);
      } else {
        setDownloadState('failed');
        setErrorMessage((err as Error).message || 'Download failed');
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  // Render appropriate button content and progress bar
  return (
    <div className={`relative inline-flex flex-col items-end ${compact ? '' : 'min-w-[124px]'}`}>
      <button
        type="button"
        onClick={startDownload}
        disabled={downloadState === 'downloading' || downloadState === 'preparing'}
        className={`group relative overflow-hidden rounded-lg font-medium transition-all duration-200 select-none ${
          compact ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-xs'
        } ${
          downloadState === 'completed'
            ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
            : downloadState === 'failed'
            ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm'
            : downloadState === 'cancelled'
            ? 'bg-zinc-600 text-white dark:bg-zinc-700'
            : downloadState === 'downloading' || downloadState === 'preparing'
            ? 'bg-zinc-800 text-white shadow-inner dark:bg-zinc-800'
            : 'bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'
        } ${className}`}
        title={errorMessage || undefined}
      >
        {/* Animated Progress Fill Background */}
        {(downloadState === 'downloading' || downloadState === 'preparing') && (
          <div
            className="absolute inset-y-0 left-0 bg-blue-600 transition-all duration-150 ease-out dark:bg-blue-500"
            style={{
              width: progress !== null ? `${progress}%` : '100%',
              opacity: progress !== null ? 0.9 : 0.4,
              animation: progress === null ? 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined,
            }}
          >
            {/* Shimmer highlight line */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        )}

        {/* Content Layer */}
        <span className="relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap">
          {downloadState === 'idle' && (
            <>
              <Download className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
              <span>Download</span>
            </>
          )}

          {downloadState === 'preparing' && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Preparing...</span>
            </>
          )}

          {downloadState === 'downloading' && (
            <>
              <span className="font-mono font-semibold tabular-nums">
                {progress !== null ? `${progress}%` : 'Streaming...'}
              </span>
              <button
                type="button"
                onClick={handleCancel}
                className="ml-1 rounded-full p-0.5 hover:bg-black/30 transition-colors"
                title="Cancel download"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          )}

          {downloadState === 'completed' && (
            <>
              <Check className="h-3.5 w-3.5 animate-in zoom-in-75 duration-200" />
              <span>Downloaded</span>
            </>
          )}

          {downloadState === 'failed' && (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </>
          )}

          {downloadState === 'cancelled' && (
            <span>Cancelled</span>
          )}
        </span>
      </button>

      {/* Real-time Byte indicator under button when actively streaming */}
      {downloadState === 'downloading' && (
        <span className="mt-1 font-mono text-[9px] text-zinc-500 dark:text-zinc-400">
          {formatBytes(receivedBytes)}
          {totalBytes ? ` / ${formatBytes(totalBytes)}` : ''}
        </span>
      )}
    </div>
  );
}

