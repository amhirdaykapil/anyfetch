'use client';

import { useState, useEffect, useCallback } from 'react';
import { DownloadHistoryItem } from '@/types/media';

const STORAGE_KEY = 'anyfetch_download_history';
const LEGACY_STORAGE_KEY = 'omnifetch_download_history';

export function useHistory() {
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
    setIsLoaded(true);
  }, []);

  const addHistoryItem = useCallback((item: DownloadHistoryItem) => {
    setHistory((prev) => {
      // Remove duplicate if already present
      const filtered = prev.filter((h) => h.originalUrl !== item.originalUrl || h.format !== item.format);
      const updated = [item, ...filtered].slice(0, 40); // keep up to 40 items
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // storage quota exceeded or disabled
      }
      return updated;
    });
  }, []);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return {
    history,
    isLoaded,
    addHistoryItem,
    removeHistoryItem,
    clearHistory,
  };
}

