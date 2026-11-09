'use client';

import { useState, useCallback } from 'react';
import { MediaResult, AnalyzeResponse, AnalyzeErrorResponse } from '@/types/media';

export function useDownloader() {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<MediaResult | null>(null);
    const [error, setError] = useState<AnalyzeErrorResponse['error'] | null>(null);

    const analyze = useCallback(async (targetUrl: string) => {
        const trimmed = targetUrl.trim();
        if (!trimmed) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: trimmed }),
            });

            const data: AnalyzeResponse = await res.json();

            if (data.success) {
                setResult(data.data);
                setError(null);
            } else {
                setError(data.error);
                setResult(null);
            }
        } catch (err) {
            setError({
                code: 'FETCH_FAILED',
                message: 'Could not connect to the media analysis service. Please check your network and try again.',
                details: (err as Error).message,
            });
            setResult(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const retry = useCallback(() => {
        if (url) {
            analyze(url);
        }
    }, [url, analyze]);

    const clear = useCallback(() => {
        setUrl('');
        setResult(null);
        setError(null);
    }, []);

    return {
        url,
        setUrl,
        isLoading,
        result,
        error,
        analyze,
        retry,
        clear,
    };
}
