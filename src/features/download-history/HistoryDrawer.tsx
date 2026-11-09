'use client';

import React from 'react';
import { X, Trash2, Download, ExternalLink, Clock, Sparkles } from 'lucide-react';
import { DownloadHistoryItem } from '@/types/media';
import { getPlatformIcon } from '@/components/PlatformIcons';
import { timeAgo } from '@/lib/utils';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: DownloadHistoryItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelectUrl?: (url: string) => void;
}

export function HistoryDrawer({
  isOpen,
  onClose,
  history,
  onRemove,
  onClear,
  onSelectUrl,
}: HistoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Download History
            </h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {history.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-red-500 dark:text-zinc-400 dark:hover:bg-zinc-900"
                title="Clear all download history"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-zinc-500 dark:text-zinc-400">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 mb-3">
                <Clock className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-200">No downloads yet</h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
                Links you inspect and files you download will be securely cataloged here on your local device.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="group relative flex gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3 transition-all hover:border-zinc-300 hover:bg-zinc-100/60 dark:border-white/[0.06] dark:bg-zinc-900/40 dark:hover:border-white/[0.12] dark:hover:bg-zinc-900/80"
              >
                {/* Thumbnail */}
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      {getPlatformIcon(item.platform, { size: 20 })}
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 rounded bg-black/75 px-1 py-0.2 text-[9px] font-semibold uppercase text-white">
                    {item.format}
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="flex-shrink-0 text-zinc-600 dark:text-zinc-400">
                        {getPlatformIcon(item.platform, { size: 12 })}
                      </span>
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        {item.platformName}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">•</span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {timeAgo(item.downloadDate)}
                      </span>
                    </div>

                    <h4
                      className="line-clamp-1 text-xs font-medium text-zinc-900 dark:text-zinc-200"
                      title={item.title}
                    >
                      {item.title}
                    </h4>
                  </div>

                  {/* Actions */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="rounded bg-zinc-200/60 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {item.quality}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {onSelectUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectUrl(item.originalUrl);
                            onClose();
                          }}
                          className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          title="Re-inspect link"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                        title="Remove from history"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Note */}
        <div className="border-t border-zinc-200 bg-zinc-50/50 p-4 text-[11px] text-zinc-500 dark:border-white/[0.08] dark:bg-zinc-900/20 dark:text-zinc-400">
          <p className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
            <span>Stored strictly on your local browser. No cloud logs.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

