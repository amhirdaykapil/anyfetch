import React from 'react';
import { AlertCircle, Lock, Ban, WifiOff, FileQuestion, RefreshCw, ExternalLink, ShieldAlert } from 'lucide-react';
import { AnalyzeErrorResponse } from '@/types/media';

interface ErrorBannerProps {
  error: AnalyzeErrorResponse['error'];
  onRetry?: () => void;
}

export function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
  const getIcon = () => {
    switch (error.code) {
      case 'PRIVATE_CONTENT':
        return <Lock className="h-5 w-5 text-amber-500" />;
      case 'RESTRICTED_CONTENT':
      case 'DELETED_POST':
        return <Ban className="h-5 w-5 text-red-500" />;
      case 'SSRF_VIOLATION':
        return <ShieldAlert className="h-5 w-5 text-rose-500" />;
      case 'RATE_LIMITED':
        return <WifiOff className="h-5 w-5 text-yellow-500" />;
      case 'UNSUPPORTED_PLATFORM':
      case 'NO_MEDIA_FOUND':
      default:
        return <FileQuestion className="h-5 w-5 text-zinc-400" />;
    }
  };

  const getTitle = () => {
    switch (error.code) {
      case 'PRIVATE_CONTENT':
        return 'Private or Restricted Media';
      case 'RESTRICTED_CONTENT':
        return 'Age or Region Restricted';
      case 'DELETED_POST':
        return 'Post Not Found';
      case 'UNSUPPORTED_PLATFORM':
        return 'Platform Not Supported Yet';
      case 'RATE_LIMITED':
        return 'Analysis Limit Reached';
      case 'SSRF_VIOLATION':
        return 'Security Policy Violation';
      case 'NO_MEDIA_FOUND':
        return 'No Downloadable Media Found';
      default:
        return 'Inspection Failed';
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-lg dark:border-white/[0.08] dark:bg-zinc-950/80">
      <div className="flex items-start gap-3.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {getTitle()}
            </h4>
            <span className="rounded bg-zinc-100 px-1.5 py-0.2 font-mono text-[10px] uppercase text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              {error.code}
            </span>
          </div>

          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {error.message}
          </p>

          {error.details && (
            <p className="mt-1 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
              Detail: {error.details}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </button>
            )}

            {error.officialUrl && (
              <a
                href={error.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <span>View on Platform</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

